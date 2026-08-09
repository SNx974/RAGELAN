import type { Metadata } from 'next';
import { TournamentCard } from '@/components/tournaments/tournament-card';
import { NeonTitle } from '@/components/motion/glitch-title';
import { Reveal, RevealGroup } from '@/components/motion/reveal';
import { getTournamentsWithCounts, aggregateCapacity } from '@/lib/queries';

export const metadata: Metadata = { title: 'Tournois' };
export const revalidate = 60;

export default async function TournamentsPage() {
  const tournaments = await getTournamentsWithCounts();
  const totals = aggregateCapacity(tournaments);

  return (
    <div className="container py-16">
      <Reveal className="mb-12 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-rage-orange">
          {totals.registered > 0
            ? `${totals.players - totals.registered} places encore disponibles sur ${totals.players}`
            : `${totals.players} places à saisir`}
        </p>
        <NeonTitle>Les {tournaments.length} tournois</NeonTitle>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
          PC, consoles et cartes sur table. Chaque tournoi a son format, ses places et son propre
          arbre de compétition.
        </p>
      </Reveal>

      <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => (
          <TournamentCard key={t.slug} tournament={t} />
        ))}
      </RevealGroup>
    </div>
  );
}
