import 'server-only';
import Stripe from 'stripe';
import { prisma } from './prisma';
import { isFullyPaid, isSeatReserved } from './pricing';
import { sendWaitlistPromotedEmail } from './email';

/** Client Stripe paresseux : l'absence de clé ne doit pas casser le build. */
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Version d'API omise : on suit celle épinglée par le paquet installé,
  // ce qui évite un décalage à chaque mise à jour de `stripe`.
  if (!cached) cached = new Stripe(key);
  return cached;
}

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Recalcule l'état d'une équipe d'après ses parts réglées.
 *
 * - en deçà du seuil : liste d'attente, aucune place consommée
 * - au seuil : la place est réservée, l'équipe attend la validation admin
 * - toutes réglées : le paiement est soldé
 *
 * Idempotent : rejouable sans risque, ce qui compte pour un webhook
 * Stripe qui peut livrer le même événement plusieurs fois.
 */
export async function syncTeamPaymentState(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      tournament: { select: { teamSize: true, reserveThreshold: true } },
      shares: { select: { status: true } },
      registrations: { select: { id: true } },
    },
  });
  if (!team) return null;

  const paid = team.shares.filter((s) => s.status === 'PAID').length;
  const reserved = isSeatReserved(paid, team.tournament);
  const complete = isFullyPaid(paid, team.tournament);

  await prisma.registration.updateMany({
    where: { teamId },
    data: {
      // L'équipe ne consomme une place qu'une fois le seuil atteint.
      status: reserved ? 'PENDING' : 'WAITLIST',
      paymentStatus: complete ? 'PAID_ONLINE' : 'PENDING',
    },
  });

  return { paid, total: team.tournament.teamSize, reserved, complete };
}

/** Marque une part comme réglée, puis réévalue l'équipe. */
export async function markSharePaid(
  shareId: string,
  method: string,
  stripeSessionId?: string,
) {
  const share = await prisma.paymentShare.findUnique({ where: { id: shareId } });
  if (!share) return null;
  // Déjà encaissée : on ne rejoue rien (webhook livré deux fois).
  if (share.status === 'PAID') return syncTeamPaymentState(share.teamId);

  await prisma.paymentShare.update({
    where: { id: shareId },
    data: {
      status: 'PAID',
      method,
      paidAt: new Date(),
      stripeSessionId: stripeSessionId ?? share.stripeSessionId,
    },
  });

  return syncTeamPaymentState(share.teamId);
}

/** Règle d'un coup toutes les parts encore dues d'une équipe. */
export async function markTeamFullyPaid(teamId: string, method: string) {
  await prisma.paymentShare.updateMany({
    where: { teamId, status: 'PENDING' },
    data: { status: 'PAID', method, paidAt: new Date() },
  });
  return syncTeamPaymentState(teamId);
}

/**
 * Une place s'est libérée : on promeut le plus ancien inscrit en liste
 * d'attente, autant de fois qu'il reste de places.
 *
 * Le promu n'a rien payé — c'est le principe de la liste d'attente : il
 * règlera sur place le jour J.
 */
export async function promoteFromWaitlist(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { maxPlayers: true, name: true },
  });
  if (!tournament) return { promoted: 0 };

  const taken = await prisma.registration.count({
    where: { tournamentId, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
  });
  const free = tournament.maxPlayers - taken;
  if (free <= 0) return { promoted: 0 };

  const waiting = await prisma.registration.findMany({
    where: { tournamentId, status: 'WAITLIST' },
    // Premier arrivé, premier servi.
    orderBy: { createdAt: 'asc' },
    take: free,
    include: { user: { select: { email: true, firstName: true } } },
  });
  if (waiting.length === 0) return { promoted: 0 };

  await prisma.registration.updateMany({
    where: { id: { in: waiting.map((w) => w.id) } },
    data: { status: 'PENDING', paymentStatus: 'PAY_ON_SITE' },
  });

  for (const w of waiting) {
    await sendWaitlistPromotedEmail({
      to: w.user.email,
      firstName: w.user.firstName,
      tournamentName: tournament.name,
      reference: w.reference,
    });
  }

  return { promoted: waiting.length };
}

/**
 * Un remboursement a été constaté chez Stripe : le participant est
 * désinscrit et sa place remise en jeu.
 */
export async function handleRefund(stripeSessionId: string | null, paymentIntentId: string | null) {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        stripeSessionId ? { stripeSessionId } : undefined,
        paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : undefined,
      ].filter(Boolean) as never,
    },
    include: { registration: { select: { id: true, tournamentId: true } } },
  });

  if (payment?.registration) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      }),
      prisma.registration.update({
        where: { id: payment.registration.id },
        data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
      }),
    ]);
    await promoteFromWaitlist(payment.registration.tournamentId);
    return { kind: 'solo' as const };
  }

  // Sinon, il peut s'agir d'une part d'équipe.
  const share = stripeSessionId
    ? await prisma.paymentShare.findUnique({
        where: { stripeSessionId },
        include: { team: { select: { id: true, tournamentId: true } } },
      })
    : null;

  if (share) {
    await prisma.paymentShare.update({
      where: { id: share.id },
      data: { status: 'REFUNDED' },
    });
    // L'équipe peut repasser sous le seuil de réservation.
    await syncTeamPaymentState(share.team.id);
    await promoteFromWaitlist(share.team.tournamentId);
    return { kind: 'share' as const };
  }

  return { kind: 'unknown' as const };
}

/**
 * Paiement intégral d'un joueur solo : la place passe en attente de
 * validation admin.
 */
export async function markSoloRegistrationPaid(
  registrationId: string,
  method: string,
  stripeSessionId?: string,
  // Conservé pour retrouver le paiement lors d'un remboursement :
  // l'événement `charge.refunded` ne porte que le PaymentIntent.
  paymentIntentId?: string | null,
) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { tournament: { select: { entryFeeCents: true } } },
  });
  if (!registration) return null;
  if (registration.paymentStatus === 'PAID_ONLINE') return registration;

  const [updated] = await prisma.$transaction([
    prisma.registration.update({
      where: { id: registrationId },
      data: { status: 'PENDING', paymentStatus: 'PAID_ONLINE' },
    }),
    prisma.payment.create({
      data: {
        userId: registration.userId,
        registrationId,
        amountCents: registration.tournament.entryFeeCents,
        status: 'PAID_ONLINE',
        method,
        stripeSessionId: stripeSessionId ?? null,
        stripePaymentIntentId: paymentIntentId ?? null,
        paidAt: new Date(),
      },
    }),
  ]);

  return updated;
}
