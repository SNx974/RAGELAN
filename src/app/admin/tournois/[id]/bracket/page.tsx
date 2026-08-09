import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BracketBoard } from '@/components/admin/bracket-board';

export const dynamic = 'force-dynamic';

export default async function AdminBracketPage({ params }: { params: { id: string } }) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      teams: { orderBy: [{ seed: 'asc' }, { name: 'asc' }] },
      brackets: {
        include: {
          matches: {
            orderBy: [{ side: 'asc' }, { round: 'asc' }, { position: 'asc' }],
            include: {
              teamA: { select: { id: true, name: true, tag: true, seed: true } },
              teamB: { select: { id: true, name: true, tag: true, seed: true } },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const bracket = tournament.brackets[0];

  return (
    <BracketBoard
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      teamCount={tournament.teams.length}
      bracketStatus={bracket?.status ?? 'DRAFT'}
      matches={(bracket?.matches ?? []).map((m) => ({
        id: m.id,
        round: m.round,
        position: m.position,
        side: m.side,
        bestOf: m.bestOf,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        winnerId: m.winnerId,
        teamA: m.teamA,
        teamB: m.teamB,
        nextMatchId: m.nextMatchId,
        stationLabel: m.stationLabel,
      }))}
    />
  );
}
