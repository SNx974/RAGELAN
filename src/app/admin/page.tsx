import Link from 'next/link';
import {
  Download,
  GitBranch,
  MapPinned,
  Users,
  Wallet,
  AlertTriangle,
  Table2,
  Armchair,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Reveal, RevealGroup } from '@/components/motion/reveal';
import { RegistrationToggle } from '@/components/admin/registration-toggle';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const [tournaments, totals, revenue] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
            },
            teams: true,
          },
        },
      },
    }),
    prisma.registration.groupBy({
      by: ['paymentStatus'],
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: { in: ['PAID_ONLINE', 'PAID_ON_SITE'] } },
      _sum: { amountCents: true },
    }),
  ]);

  const registered = tournaments.reduce((n, t) => n + t._count.registrations, 0);
  const capacity = tournaments.reduce((n, t) => n + t.maxPlayers, 0);
  const unpaid = totals.find((t) => t.paymentStatus === 'PENDING')?._count ?? 0;

  return (
    <div className="space-y-8">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Vue d&apos;ensemble</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {registered} inscrits sur {capacity} places disponibles.
            </p>
          </div>
          <RegistrationToggle />
        </div>
      </Reveal>

      <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Inscrits" value={`${registered}/${capacity}`} />
        <KpiCard
          icon={Wallet}
          label="Encaissé"
          value={formatPrice(revenue._sum.amountCents ?? 0)}
        />
        <KpiCard icon={AlertTriangle} label="Paiements en attente" value={String(unpaid)} />
        <KpiCard
          icon={GitBranch}
          label="Équipes"
          value={String(tournaments.reduce((n, t) => n + t._count.teams, 0))}
        />
      </RevealGroup>

      <Reveal>
        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <h2 className="font-display text-lg font-bold text-white">Tournois</h2>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {tournaments.map((t) => {
              const fill = t.maxPlayers ? t._count.registrations / t.maxPlayers : 0;
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] sm:px-5"
                >
                  <div className="min-w-0 flex-1 sm:min-w-[160px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: t.accentFrom }}
                      />
                      <p className="font-semibold text-white">{t.name}</p>
                      <Badge variant={t.registrationOpen ? 'success' : 'neutral'}>
                        {t.registrationOpen ? 'Ouvert' : 'Fermé'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">{t.formatLabel}</p>
                    {/* Capacités matérielles : réservées à l'organisation. */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/30">
                      <span className="flex items-center gap-1">
                        <Table2 className="size-3" />
                        {t.tableCount} tables
                      </span>
                      <span className="flex items-center gap-1">
                        <Armchair className="size-3" />
                        {t.chairCount} chaises
                      </span>
                      <span>{t.seatFormat === 'FIXED' ? 'Places fixes' : 'Rotation'}</span>
                    </p>
                  </div>

                  <div className="w-full sm:w-40">
                    <div className="mb-1 flex justify-between text-[11px] text-white/45">
                      <span>
                        {t._count.registrations}/{t.maxPlayers}
                      </span>
                      <span>{Math.round(fill * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, fill * 100)}%`,
                          background: `linear-gradient(90deg, ${t.accentFrom}, ${t.accentTo})`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/tournois/${t.id}/bracket`}>
                        <GitBranch />
                        Arbre
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/tournois/${t.id}/placement`}>
                        <MapPinned />
                        Placement
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a
                        href={`/api/admin/tournaments/${t.id}/attendance`}
                        target="_blank"
                        rel="noreferrer"
                        title="Télécharger la fiche de présence PDF"
                      >
                        <Download />
                        PDF
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card spotlight p-5">
      <Icon className="size-5 text-rage-orange" />
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
