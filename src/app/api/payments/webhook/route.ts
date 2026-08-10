import { NextResponse } from 'next/server';
import { getStripe, markSharePaid, markSoloRegistrationPaid, markTeamFullyPaid } from '@/lib/payments';

export const runtime = 'nodejs';
// La signature Stripe se vérifie sur le corps brut : aucun cache, aucune
// transformation du flux.
export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/webhook
 *
 * Seule source de vérité du paiement : la page de retour peut être
 * fermée ou rejouée par le joueur, pas ce webhook.
 *
 * Dokploy : déclarer l'URL dans Stripe puis renseigner
 * STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Signature absente' }, { status: 400 });

  const raw = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    // Signature invalide : requête non authentifiée, on refuse.
    console.error('[stripe] signature invalide :', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as {
    id: string;
    metadata?: Record<string, string> | null;
  };
  const meta = session.metadata ?? {};

  try {
    switch (meta.kind) {
      case 'share':
        await markSharePaid(meta.shareId, 'stripe', session.id);
        break;
      case 'team':
        await markTeamFullyPaid(meta.teamId, 'stripe');
        break;
      case 'solo':
        await markSoloRegistrationPaid(meta.registrationId, 'stripe', session.id);
        break;
      default:
        console.warn('[stripe] session sans metadata exploitable :', session.id);
    }
  } catch (e) {
    // On renvoie 500 pour que Stripe rejoue l'événement : les fonctions
    // appelées sont idempotentes, un rejeu est sans effet de bord.
    console.error('[stripe] traitement échoué :', e);
    return NextResponse.json({ error: 'Traitement échoué' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
