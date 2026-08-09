import Link from 'next/link';
import { Armchair, MapPinned, Table2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminPlacementIndexPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          seats: true,
          registrations: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } },
        },
      },
    },
  });

  const placed = await prisma.seatPlacement.groupBy({
    by: ['teamId'],
    _count: true,
  });

  // Nombre de sièges occupés par tournoi, en une requête.
  const occupancy = await prisma.seat.groupBy({
    by: ['tournamentId'],
    where: { placement: { isNot: null } },
    _count: true,
  });
  const occupiedBy = new Map(occupancy.map((o) => [o.tournamentId, o._count]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          Salle
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Plan de salle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisis un tournoi pour placer ses joueurs. Le nombre de tables et de chaises se
          règle depuis la page Tournois.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => {
          const occupied = occupiedBy.get(t.id) ?? 0;
          return (
            <div key={t.id} className="glass-card spotlight p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-white">{t.name}</h2>
                <Badge variant={t.seatFormat === 'FIXED' ? 'default' : 'yellow'}>
                  {t.seatFormat === 'FIXED' ? 'Fixe' : 'Rotation'}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                <span className="flex items-center gap-1.5">
                  <Table2 className="size-3" />
                  {t.tableCount} tables
                </span>
                <span className="flex items-center gap-1.5">
                  <Armchair className="size-3" />
                  {t._count.seats} sièges
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[11px] text-white/45">
                  <span>
                    {occupied} placés sur {t._count.registrations} inscrits
                  </span>
                  <span>{t._count.seats > 0 ? Math.round((occupied / t._count.seats) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${t._count.seats > 0 ? Math.min(100, (occupied / t._count.seats) * 100) : 0}%`,
                      background: `linear-gradient(90deg, ${t.accentFrom}, ${t.accentTo})`,
                    }}
                  />
                </div>
              </div>

              <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                <Link href={`/admin/tournois/${t.id}/placement`}>
                  <MapPinned />
                  Ouvrir le plan
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
