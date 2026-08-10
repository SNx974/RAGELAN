import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { PaymentLedger, type LedgerRow } from '@/components/admin/payment-ledger';

export const dynamic = 'force-dynamic';

/**
 * Journal des paiements, réservé au SUPER_ADMIN.
 *
 * Deux tables portent l'argent : `Payment` pour les joueurs solo,
 * `PaymentShare` pour les parts d'équipe. On les fusionne ici en une
 * seule liste chronologique, avec l'identifiant Stripe cliquable pour
 * un contrôle manuel.
 */
export default async function AdminPaymentsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/paiements');
  if (session.role !== 'SUPER_ADMIN') {
    return (
      <div className="glass-card px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Accès réservé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seul un super administrateur consulte le journal des paiements.
        </p>
      </div>
    );
  }

  const [payments, shares] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        registration: {
          select: { reference: true, tournament: { select: { name: true } } },
        },
      },
      take: 500,
    }),
    prisma.paymentShare.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { firstName: true, lastName: true, email: true, reference: true } },
        team: { select: { name: true, tournament: { select: { name: true } } } },
      },
      take: 500,
    }),
  ]);

  const rows: LedgerRow[] = [
    ...payments.map((p) => ({
      id: p.id,
      kind: 'solo' as const,
      payer: `${p.user.lastName.toUpperCase()} ${p.user.firstName}`,
      email: p.user.email,
      tournamentName: p.registration?.tournament.name ?? '—',
      teamName: null,
      reference: p.registration?.reference ?? null,
      amountCents: p.amountCents,
      status: p.status,
      method: p.method,
      stripeId: p.stripePaymentIntentId ?? p.stripeSessionId,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    ...shares.map((s) => ({
      id: s.id,
      kind: 'share' as const,
      payer: `${s.member.lastName.toUpperCase()} ${s.member.firstName}`,
      email: s.member.email,
      tournamentName: s.team.tournament.name,
      teamName: s.team.name,
      reference: s.member.reference,
      amountCents: s.amountCents,
      status: s.status,
      method: s.method ?? 'stripe',
      stripeId: s.stripeSessionId,
      paidAt: s.paidAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return <PaymentLedger rows={rows} />;
}
