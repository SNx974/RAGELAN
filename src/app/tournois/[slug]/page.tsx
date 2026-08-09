import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Gamepad2, UserPlus, Users, Ticket, Swords, ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getTournamentDetail } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { GlitchTitle } from '@/components/motion/glitch-title';
import { BracketTree } from '@/components/brackets/bracket-tree';
import { TeamRoster } from '@/components/tournaments/team-roster';
import { cn, formatPrice } from '@/lib/utils';

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const t = await getTournamentDetail(params.slug);
  return { title: t?.name ?? 'Tournoi', description: t?.tagline };
}

export default async function TournamentPage({ params }: { params: { slug: string } }) {
  const [tournament, session] = await Promise.all([
    getTournamentDetail(params.slug),
    getSession(),
  ]);

  if (!tournament) notFound();

  const slotsLeft = Math.max(0, tournament.maxPlayers - tournament.registered);

  return (
    <div className="container py-12">
      <Link
        href="/tournois"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Tous les tournois
      </Link>

      {/* En-tête */}
      <Reveal>
        {/*
          Le personnage déborde au-dessus du bandeau. `.glass-card` étant en
          `overflow-hidden`, il doit vivre en dehors de la carte : ce wrapper
          réserve la hauteur du débordement (pt-24 = 96 px) et sert d'ancrage.
        */}
        <div className="relative lg:pt-24">
        <div className="glass-card relative overflow-hidden p-8 sm:p-12">
          {/* Bandeau du jeu, sous le verre. */}
          {tournament.bannerImage && (
            <>
              {/*
                Mobile : bande en haut. Le bloc y est très haut (ratio ~0.6),
                un `cover` plein cadre rognerait ~80 % d'une source 8:3.
                sm+ : le bloc redevient large, l'image couvre tout.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element -- asset local, ratio libre */}
              <img
                src={tournament.bannerImage}
                alt=""
                aria-hidden
                className="absolute inset-x-0 top-0 h-44 w-full object-cover opacity-45 sm:inset-0 sm:h-full"
              />
              {/* Dégradé latéral : le texte reste lisible à gauche. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-transparent via-abyss/80 to-abyss sm:bg-gradient-to-r sm:from-abyss sm:via-abyss/85 sm:to-abyss/25"
              />
              <div
                aria-hidden
                className="absolute inset-0 hidden bg-gradient-to-t from-abyss/90 to-transparent sm:block"
              />
            </>
          )}

          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.14]"
            style={{
              background: `linear-gradient(135deg, ${tournament.accentFrom}, ${tournament.accentTo})`,
            }}
          />
          {/* Le contenu se resserre à gauche pour laisser la place au personnage. */}
          <div className={cn('relative', tournament.characterImage && 'lg:max-w-[60%]')}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="solid">{tournament.platform}</Badge>
              <Badge variant={tournament.registrationOpen && slotsLeft > 0 ? 'success' : 'neutral'}>
                {slotsLeft === 0
                  ? 'Complet'
                  : tournament.registrationOpen
                    ? `${slotsLeft} places restantes`
                    : 'Inscriptions fermées'}
              </Badge>
            </div>

            <GlitchTitle
              text={tournament.name}
              className="mt-4 text-[clamp(2.25rem,7vw,4.5rem)] font-bold"
            />
            <p className="mt-3 max-w-xl text-lg text-white/60">{tournament.tagline}</p>

            {/* Volontairement sans tables/chaises : info d'organisation, pas de communication. */}
            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric icon={Users} value={tournament.maxPlayers} label="joueurs" />
              <Metric icon={Gamepad2} value={tournament.platform} label="plateforme" />
              <Metric icon={UserPlus} value={slotsLeft} label="places libres" />
              <Metric
                icon={Ticket}
                value={
                  tournament.entryFeeCents === 0
                    ? 'Gratuit'
                    : formatPrice(tournament.entryFeeCents)
                }
                label="entrée"
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" disabled={!tournament.registrationOpen}>
                <Link href={session ? `/inscription/${tournament.slug}` : '/login'}>
                  <Swords />
                  {tournament.teamSize > 1 ? 'Inscrire mon équipe' : "S'inscrire"}
                </Link>
              </Button>
              <p className="text-sm text-white/45">{tournament.formatLabel}</p>
            </div>
          </div>
        </div>

          {/*
            Personnage détouré. `inset-y-0` + `h-full` sur le wrapper (qui est
            96 px plus haut que la carte) le fait dépasser du haut, tandis que
            ses pieds restent alignés sur le bas du bandeau.
            Masqué sous `lg` : la carte y est en portrait, il n'y a pas la place.
          */}
          {tournament.characterImage && (
            // eslint-disable-next-line @next/next/no-img-element -- asset local, ratio libre
            <img
              src={tournament.characterImage}
              alt=""
              aria-hidden
              // `max-w-[34%]` : garde-fou. Sans lui, une source en paysage
              // (ex. 4:3) dimensionnée par sa hauteur deviendrait assez large
              // pour recouvrir le texte. Elle est alors réduite et reste
              // ancrée en bas à droite.
              className="pointer-events-none absolute inset-y-0 -right-2 hidden h-full w-auto max-w-[34%] select-none object-contain object-bottom drop-shadow-[0_24px_36px_rgba(0,0,0,.7)] lg:block xl:-right-6"
            />
          )}
        </div>
      </Reveal>

      {/* Équipes engagées */}
      {tournament.teamSize > 1 && (
        <div className="mt-14">
          <Reveal className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rage-orange">
              Ils sont inscrits
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              {tournament.teams.length > 0
                ? `Équipes engagées (${tournament.teams.length})`
                : 'Aucune équipe engagée pour le moment'}
            </h2>
            {tournament.teams.length === 0 && (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Les équipes apparaissent ici une fois leur inscription validée par
                l&apos;organisation. Sois la première à te lancer.
              </p>
            )}
          </Reveal>

          {tournament.teams.length > 0 && (
            <TeamRoster teams={tournament.teams} accent={tournament.accentFrom} />
          )}
        </div>
      )}

      {/* Arbre public (lecture seule) */}
      {tournament.matches.length > 0 && (
        <Reveal className="mt-12">
          <h2 className="mb-5 font-display text-2xl font-bold text-white">Arbre de tournoi</h2>
          <BracketTree matches={tournament.matches} />
        </Reveal>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3.5">
      <Icon className="mb-2 size-4 text-white/35" />
      <p className="font-display text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
