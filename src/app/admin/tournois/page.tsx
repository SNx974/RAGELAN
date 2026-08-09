import { prisma } from '@/lib/prisma';
import { TournamentEditor, type EditableTournament } from '@/components/admin/tournament-editor';

export const dynamic = 'force-dynamic';

export default async function AdminTournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          registrations: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } },
          teams: true,
          seats: true,
        },
      },
    },
  });

  const rows: EditableTournament[] = tournaments.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    formatLabel: t.formatLabel,
    entryFeeCents: t.entryFeeCents,
    maxPlayers: t.maxPlayers,
    maxTeams: t.maxTeams,
    teamSize: t.teamSize,
    tableCount: t.tableCount,
    chairCount: t.chairCount,
    seatFormat: t.seatFormat,
    registrationOpen: t.registrationOpen,
    accentFrom: t.accentFrom,
    registered: t._count.registrations,
    teamCount: t._count.teams,
    seatCount: t._count.seats,
  }));

  return <TournamentEditor tournaments={rows} />;
}
