import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Armchair, CreditCard, Trophy, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { StripeCheckoutButton } from '@/components/payments/stripe-checkout-button';
import { formatPrice } from '@/lib/utils';
import { logoutAction } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

const PAYMENT_LABEL: Record<string, { label: string; variant: 'success' | 'red' | 'yellow' }> = {
  PENDING: { label: 'À régler', variant: 'red' },
  PAID_ONLINE: { label: 'Payé en ligne', variant: 'success' },
  PAY_ON_SITE: { label: 'Paiement sur place', variant: 'yellow' },
  PAID_ON_SITE: { label: 'Payé sur place', variant: 'success' },
  REFUNDED: { label: 'Remboursé', variant: 'yellow' },
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/dashboard');

  const registrations = await prisma.registration.findMany({
    where: { userId: session.sub },
    include: {
      tournament: true,
      team: { include: { members: true } },
      seatPlacement: { include: { seat: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const due = registrations
    .filter((r) => r.paymentStatus === 'PENDING' || r.paymentStatus === 'PAY_ON_SITE')
    .reduce((sum, r) => sum + r.tournament.entryFeeCents, 0);

  return (
    <div className="container py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
              Mon espace
            </p>
            <h1 className="font-display text-3xl font-bold text-white">{session.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {registrations.length} inscription{registrations.length > 1 ? 's' : ''}
              {due > 0 && ` · ${formatPrice(due)} restant à régler`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/tournois">
                <Trophy />
                Rejoindre un tournoi
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </Reveal>

      {registrations.length === 0 ? (
        <Reveal className="mt-10">
          <div className="glass-card grid place-items-center px-6 py-20 text-center">
            <Trophy className="mb-4 size-10 text-white/15" />
            <p className="font-display text-lg font-bold text-white">Aucune inscription</p>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Choisis ton tournoi et réserve ta place avant que tout parte.
            </p>
            <Button asChild className="mt-6">
              <Link href="/tournois">Voir les tournois</Link>
            </Button>
          </div>
        </Reveal>
      ) : (
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {registrations.map((r, i) => {
            const payment = PAYMENT_LABEL[r.paymentStatus];
            const needsPayment =
              r.paymentStatus === 'PENDING' && r.tournament.entryFeeCents > 0;

            return (
              <Reveal key={r.id} delay={i * 0.06}>
                <div className="glass-card spotlight relative overflow-hidden p-6">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                      background: `linear-gradient(135deg, ${r.tournament.accentFrom}, ${r.tournament.accentTo})`,
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl font-bold text-white">
                          {r.tournament.name}
                        </h2>
                        <p className="text-xs text-white/40">{r.tournament.formatLabel}</p>
                      </div>
                      <Badge variant={payment.variant}>{payment.label}</Badge>
                    </div>

                    <div className="mt-5 grid gap-2 text-sm">
                      <Row icon={Trophy} label="Statut" value={statusLabel(r.status)} />
                      {r.team && (
                        <Row
                          icon={Users}
                          label="Équipe"
                          value={`${r.team.name} · ${r.team.members.length} joueurs`}
                        />
                      )}
                      <Row
                        icon={Armchair}
                        label="Place"
                        value={
                          r.seatPlacement
                            ? `${r.seatPlacement.seat.seatLabel} — ${r.seatPlacement.seat.zone}`
                            : 'Attribuée avant l’événement'
                        }
                      />
                      <Row
                        icon={CreditCard}
                        label="Montant"
                        value={
                          r.tournament.entryFeeCents === 0
                            ? 'Gratuit'
                            : formatPrice(r.tournament.entryFeeCents)
                        }
                      />
                    </div>

                    {needsPayment && (
                      <StripeCheckoutButton
                        registrationId={r.id}
                        amountCents={r.tournament.entryFeeCents}
                        className="mt-5"
                      />
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  return (
    {
      PENDING: 'En attente de validation',
      CONFIRMED: 'Place confirmée',
      WAITLIST: 'Liste d’attente',
      CHECKED_IN: 'Présent sur place',
      CANCELLED: 'Annulée',
      NO_SHOW: 'Absent',
    }[status] ?? status
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-white/30" />
      <span className="text-white/40">{label}</span>
      <span className="ml-auto truncate text-right font-medium text-white">{value}</span>
    </div>
  );
}
