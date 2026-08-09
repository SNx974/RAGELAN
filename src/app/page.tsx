import Link from 'next/link';
import { CalendarClock, CreditCard, MapPinned, Swords, Users2, Trophy } from 'lucide-react';
import { Hero } from '@/components/home/hero';
import { StatsStrip } from '@/components/home/stats-strip';
import { TournamentCard } from '@/components/tournaments/tournament-card';
import { NeonTitle } from '@/components/motion/glitch-title';
import { Reveal, RevealGroup } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { getTournamentsWithCounts, aggregateCapacity } from '@/lib/queries';
import { getLogoSrc } from '@/lib/logo';

export const revalidate = 60;

export default async function HomePage() {
  const tournaments = await getTournamentsWithCounts();
  const totals = aggregateCapacity(tournaments);

  return (
    <>
      <Hero
        totalSeats={totals.players}
        tournamentCount={tournaments.length}
        logoSrc={getLogoSrc()}
      />

      <StatsStrip
        players={totals.players}
        tournaments={tournaments.length}
        registered={totals.registered}
      />

      {/* ── Les 9 tournois ─────────────────────────────────── */}
      <section id="tournois" className="container scroll-mt-24 py-24">
        <Reveal className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-rage-orange">
            La compétition
          </p>
          <NeonTitle>Les {tournaments.length} tournois</NeonTitle>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
            Choisis ton terrain de jeu. Chaque tournoi a son format, son nombre de places et son
            plan de salle dédié.
          </p>
        </Reveal>

        <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.slug} tournament={t} />
          ))}
        </RevealGroup>
      </section>

      {/* ── Comment ça marche ──────────────────────────────── */}
      <section className="relative py-24">
        <div className="neon-divider mb-24" />
        <div className="container">
          <Reveal className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-rage-orange">
              Mode d&apos;emploi
            </p>
            <NeonTitle>De l&apos;inscription au trophée</NeonTitle>
          </Reveal>

          <RevealGroup className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users2,
                step: '01',
                title: 'Crée ton compte',
                text: "Nom, prénom, âge, adresse et téléphone. Une minute, pas plus.",
              },
              {
                icon: Swords,
                step: '02',
                title: 'Inscris-toi',
                text: 'En capitaine avec ton roster complet, ou en solo — on te trouve une équipe.',
              },
              {
                icon: CreditCard,
                step: '03',
                title: 'Règle ta place',
                text: 'Paiement en ligne, ou sur place le jour J. Ton statut est visible sur ton profil.',
              },
              {
                icon: MapPinned,
                step: '04',
                title: 'Trouve ta place',
                text: 'Ton siège est attribué sur le plan de salle. Check-in à l’entrée, et c’est parti.',
              },
            ].map((item) => (
              <Reveal key={item.step}>
                <div className="glass-card spotlight h-full p-6">
                  <div className="flex items-start justify-between">
                    <div className="grid size-11 place-items-center rounded-xl bg-rage-gradient-soft">
                      <item.icon className="size-5 text-rage-orange" />
                    </div>
                    <span className="font-display text-3xl font-bold text-white/[0.07]">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────── */}
      <section className="container pb-8">
        <Reveal>
          <div className="glass-card relative overflow-hidden px-8 py-16 text-center sm:px-16">
            <div
              aria-hidden
              className="absolute inset-0 bg-rage-gradient opacity-[0.13]"
            />
            <div
              aria-hidden
              className="grid-backdrop absolute inset-0 opacity-40"
            />
            <div className="relative">
              <Trophy className="mx-auto mb-5 size-10 text-rage-yellow drop-shadow-[0_0_18px_rgba(255,199,0,.5)]" />
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Les places partent vite.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-balance text-white/60">
                {totals.players} places au total, réparties sur {tournaments.length} tournois.
                Réserve la tienne avant la fermeture des inscriptions.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">Créer mon compte</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/planning">
                    <CalendarClock />
                    Voir le planning
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
