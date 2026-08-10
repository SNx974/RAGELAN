import 'server-only';
import Stripe from 'stripe';
import { prisma } from './prisma';
import { isFullyPaid, isSeatReserved } from './pricing';

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
 * Paiement intégral d'un joueur solo : la place passe en attente de
 * validation admin.
 */
export async function markSoloRegistrationPaid(
  registrationId: string,
  method: string,
  stripeSessionId?: string,
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
        paidAt: new Date(),
      },
    }),
  ]);

  return updated;
}
