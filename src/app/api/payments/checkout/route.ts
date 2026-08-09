import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/payments/checkout
 *
 * Squelette Stripe Checkout. Renseigne STRIPE_SECRET_KEY puis décommente
 * le bloc ci-dessous — le reste de la chaîne (Payment, statuts, webhook)
 * est déjà en place côté base.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });

  const { registrationId } = (await request.json()) as { registrationId?: string };
  if (!registrationId) {
    return NextResponse.json({ error: 'registrationId manquant' }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { tournament: true, user: { select: { email: true } } },
  });

  if (!registration || registration.userId !== session.sub) {
    return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 });
  }
  if (registration.paymentStatus === 'PAID_ONLINE' || registration.paymentStatus === 'PAID_ON_SITE') {
    return NextResponse.json({ error: 'Cette inscription est déjà réglée' }, { status: 409 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Le paiement en ligne n’est pas encore activé. Choisis « payer sur place ».' },
      { status: 503 },
    );
  }

  // ── Intégration Stripe (à activer) ─────────────────────────
  //
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const checkout = await stripe.checkout.sessions.create({
  //   mode: 'payment',
  //   customer_email: registration.user.email,
  //   line_items: [{
  //     quantity: 1,
  //     price_data: {
  //       currency: 'eur',
  //       unit_amount: registration.tournament.entryFeeCents,
  //       product_data: { name: `R.A.G.E LAN 2 — ${registration.tournament.name}` },
  //     },
  //   }],
  //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?paid=1`,
  //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=1`,
  //   metadata: { registrationId },
  // });
  //
  // await prisma.payment.create({
  //   data: {
  //     userId: registration.userId,
  //     registrationId,
  //     amountCents: registration.tournament.entryFeeCents,
  //     status: 'PENDING',
  //     method: 'stripe',
  //     stripeSessionId: checkout.id,
  //   },
  // });
  //
  // return NextResponse.json({ url: checkout.url });

  return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
}
