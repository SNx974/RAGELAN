import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getStripe } from '@/lib/payments';
import { totalDueCents } from '@/lib/pricing';
import { formatPrice } from '@/lib/utils';

/** Libellé du relevé Stripe : NOM - PRENOM - TOURNOI - MONTANT. */
function paymentLabel(lastName: string, firstName: string, tournament: string, cents: number) {
  return `${lastName.toUpperCase()} - ${firstName} - ${tournament} - ${formatPrice(cents)}`;
}

export const runtime = 'nodejs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * POST /api/payments/checkout
 *
 * Ouvre une session Stripe Checkout pour l'un des trois cas :
 *   { registrationId }  paiement intégral d'un joueur solo
 *   { teamId }          le capitaine règle toute son équipe
 *   { shareToken }      un joueur règle sa part (lien public, sans compte)
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Le paiement en ligne n’est pas encore activé.' },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    registrationId?: string;
    teamId?: string;
    shareToken?: string;
  };

  // ── Part individuelle : accessible sans compte, via le jeton du lien ──
  if (body.shareToken) {
    const share = await prisma.paymentShare.findUnique({
      where: { token: body.shareToken },
      include: {
        member: {
          select: { pseudo: true, firstName: true, lastName: true, email: true, reference: true },
        },
        team: { include: { tournament: { select: { name: true } } } },
      },
    });
    if (!share) return NextResponse.json({ error: 'Lien inconnu' }, { status: 404 });
    if (share.status === 'PAID') {
      return NextResponse.json({ error: 'Cette part est déjà réglée.' }, { status: 409 });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: share.member.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: share.amountCents,
            product_data: {
              // Format impose : NOM - PRENOM - TOURNOI - MONTANT.
              // C'est ce libelle qui apparait sur le releve Stripe et
              // permet de rapprocher un paiement d'un participant.
              name: paymentLabel(
                share.member.lastName,
                share.member.firstName,
                share.team.tournament.name,
                share.amountCents,
              ),
              description: `Équipe ${share.team.name} · réf. ${share.member.reference}`,
            },
          },
        },
      ],
      success_url: `${APP_URL}/paiement/${share.token}?paye=1`,
      cancel_url: `${APP_URL}/paiement/${share.token}?annule=1`,
      metadata: { kind: 'share', shareId: share.id },
    });

    await prisma.paymentShare.update({
      where: { id: share.id },
      data: { stripeSessionId: checkout.id },
    });

    return NextResponse.json({ url: checkout.url });
  }

  // ── Les deux autres cas exigent un compte ──────────────────────────
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });

  if (body.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: body.teamId },
      include: {
        tournament: { select: { name: true, entryFeeCents: true, teamSize: true } },
        captain: { select: { firstName: true, lastName: true } },
        shares: { where: { status: 'PENDING' }, select: { id: true, amountCents: true } },
      },
    });
    if (!team) return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 });
    if (team.captainId !== session.sub) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    if (team.shares.length === 0) {
      return NextResponse.json({ error: 'Tout est déjà réglé.' }, { status: 409 });
    }

    const amount = team.shares.reduce((sum, s) => sum + s.amountCents, 0);
    const captainUser = team.captain;
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: team.contactEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amount,
            product_data: {
              name: paymentLabel(
                captainUser.lastName,
                captainUser.firstName,
                team.tournament.name,
                amount,
              ),
              description: `Équipe ${team.name} · ${team.shares.length} place(s) restante(s)`,
            },
          },
        },
      ],
      success_url: `${APP_URL}/dashboard?paye=1`,
      cancel_url: `${APP_URL}/dashboard?annule=1`,
      metadata: { kind: 'team', teamId: team.id },
    });

    return NextResponse.json({ url: checkout.url });
  }

  if (body.registrationId) {
    const registration = await prisma.registration.findUnique({
      where: { id: body.registrationId },
      include: {
        tournament: { select: { name: true, entryFeeCents: true, teamSize: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!registration || registration.userId !== session.sub) {
      return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 });
    }
    if (registration.paymentStatus === 'PAID_ONLINE') {
      return NextResponse.json({ error: 'Déjà réglé.' }, { status: 409 });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: registration.user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: totalDueCents(registration.tournament),
            product_data: {
              name: paymentLabel(
                registration.user.lastName,
                registration.user.firstName,
                registration.tournament.name,
                totalDueCents(registration.tournament),
              ),
              description: `Réf. ${registration.reference}`,
            },
          },
        },
      ],
      success_url: `${APP_URL}/dashboard?paye=1`,
      cancel_url: `${APP_URL}/dashboard?annule=1`,
      metadata: { kind: 'solo', registrationId: registration.id },
    });

    return NextResponse.json({ url: checkout.url });
  }

  return NextResponse.json({ error: 'Requête incomplète' }, { status: 400 });
}
