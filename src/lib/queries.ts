import 'server-only';
import { prisma } from './prisma';
import { TOURNAMENTS } from './tournaments-data';
import type { TournamentCardData } from '@/components/tournaments/tournament-card';
import type { BracketMatch } from '@/components/brackets/bracket-tree';
import { getGameImage } from './game-images';

/**
 * Liste des tournois + nombre d'inscrits.
 * Retombe sur les données statiques si la base n'est pas encore
 * migrée/seedée, pour que le site reste affichable en local.
 */
export async function getTournamentsWithCounts(): Promise<TournamentCardData[]> {
  try {
    const rows = await prisma.tournament.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
            },
          },
        },
      },
    });

    if (rows.length > 0) {
      return rows.map((t) => ({
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        platform: t.platform,
        maxPlayers: t.maxPlayers,
        formatLabel: t.formatLabel,
        entryFeeCents: t.entryFeeCents,
        accentFrom: t.accentFrom,
        accentTo: t.accentTo,
        registrationOpen: t.registrationOpen,
        registered: t._count.registrations,
        // La valeur en base prime ; sinon on suit la convention de fichiers.
        coverImage: t.coverImage ?? getGameImage(t.slug, 'card'),
      }));
    }
  } catch (error) {
    console.warn('[queries] Base indisponible, fallback statique.', error);
  }

  return TOURNAMENTS.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    platform: t.platform,
    maxPlayers: t.maxPlayers,
    formatLabel: t.formatLabel,
    entryFeeCents: t.entryFeeCents,
    accentFrom: t.accentFrom,
    accentTo: t.accentTo,
    registrationOpen: true,
    registered: 0,
    coverImage: getGameImage(t.slug, 'card'),
  }));
}

export type TournamentDetail = {
  id: string | null;
  slug: string;
  name: string;
  tagline: string;
  platform: string;
  maxPlayers: number;
  teamSize: number;
  formatLabel: string;
  entryFeeCents: number;
  accentFrom: string;
  accentTo: string;
  registrationOpen: boolean;
  registered: number;
  bannerImage: string | null;
  characterImage: string | null;
  teams: PresentedTeam[];
  matches: BracketMatch[];
};

/** Équipe telle qu'affichée publiquement sur la fiche du tournoi. */
export type PresentedTeam = {
  id: string;
  name: string;
  tag: string | null;
  seed: number | null;
  hasLogo: boolean;
  players: { pseudo: string; firstName: string; lastName: string; isCaptain: boolean; isSubstitute: boolean }[];
};

/**
 * Fiche d'un tournoi. Comme la liste, retombe sur les données statiques
 * si la base est injoignable — le site reste navigable avant migration.
 */
export async function getTournamentDetail(slug: string): Promise<TournamentDetail | null> {
  try {
    const t = await prisma.tournament.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            registrations: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } },
          },
        },
        teams: {
          // Seules les équipes validées par un admin sont publiées.
          where: { status: 'APPROVED' },
          orderBy: [{ seed: 'asc' }, { name: 'asc' }],
          include: {
            members: {
              orderBy: [{ isCaptain: 'desc' }, { isSubstitute: 'asc' }, { pseudo: 'asc' }],
              select: {
                pseudo: true,
                firstName: true,
                lastName: true,
                isCaptain: true,
                isSubstitute: true,
              },
            },
          },
        },
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

    // Base joignable mais tournoi absent (non seedée) : on retombe sur la
    // définition statique, comme le fait la liste. Sans cela la liste
    // affichait 9 tournois pendant que chaque fiche renvoyait un 404.
    if (!t) return staticDetail(slug);

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      platform: t.platform,
      maxPlayers: t.maxPlayers,
      teamSize: t.teamSize,
      formatLabel: t.formatLabel,
      entryFeeCents: t.entryFeeCents,
      accentFrom: t.accentFrom,
      accentTo: t.accentTo,
      registrationOpen: t.registrationOpen,
      registered: t._count.registrations,
      bannerImage: getGameImage(t.slug, 'banner'),
      characterImage: getGameImage(t.slug, 'character'),
      teams: t.teams.map((team) => ({
        id: team.id,
        name: team.name,
        tag: team.tag,
        seed: team.seed,
        hasLogo: team.logoData !== null,
        players: team.members,
      })),
      matches: (t.brackets[0]?.matches ?? []).map((m) => ({
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
      })),
    };
  } catch (error) {
    console.warn('[queries] Base indisponible, fiche tournoi en statique.', error);
  }

  return staticDetail(slug);
}

/** Fiche construite depuis les données statiques, sans équipes ni arbre. */
function staticDetail(slug: string): TournamentDetail | null {
  const t = TOURNAMENTS.find((x) => x.slug === slug);
  if (!t) return null;

  return {
    id: null,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    platform: t.platform,
    maxPlayers: t.maxPlayers,
    teamSize: t.teamSize,
    formatLabel: t.formatLabel,
    entryFeeCents: t.entryFeeCents,
    accentFrom: t.accentFrom,
    accentTo: t.accentTo,
    registrationOpen: true,
    registered: 0,
    bannerImage: getGameImage(t.slug, 'banner'),
    characterImage: getGameImage(t.slug, 'character'),
    teams: [],
    matches: [],
  };
}

/** Agrégat public : uniquement des chiffres joueurs, pas de matériel. */
export function aggregateCapacity(tournaments: TournamentCardData[]) {
  return tournaments.reduce(
    (acc, t) => ({
      players: acc.players + t.maxPlayers,
      registered: acc.registered + t.registered,
    }),
    { players: 0, registered: 0 },
  );
}
