import 'server-only';
import type { BracketType, Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Ordre de seeding standard : 1v8, 4v5, 2v7, 3v6…
 * Garantit que les têtes de série ne se croisent qu'en finale.
 */
export function seedOrder(size: number): number[] {
  let rounds = [1, 2];
  while (rounds.length < size) {
    const next: number[] = [];
    const total = rounds.length * 2 + 1;
    for (const seed of rounds) {
      next.push(seed, total - seed);
    }
    rounds = next;
  }
  return rounds;
}

export function nextPowerOfTwo(n: number) {
  return n <= 1 ? 1 : 2 ** Math.ceil(Math.log2(n));
}

type DraftMatch = {
  key: string;
  round: number;
  position: number;
  side: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
  teamAId?: string | null;
  teamBId?: string | null;
  nextKey?: string;
  nextSlot?: 'A' | 'B';
  loserKey?: string;
  loserSlot?: 'A' | 'B';
};

/**
 * Construit la structure d'un arbre à élimination simple.
 * Les équipes manquantes (bracket non plein) produisent des byes :
 * le match est marqué WALKOVER et le vainqueur remonte immédiatement.
 */
function buildSingleElimination(teamIds: string[]): DraftMatch[] {
  const size = nextPowerOfTwo(teamIds.length);
  const order = seedOrder(size);
  const rounds = Math.log2(size);
  const matches: DraftMatch[] = [];

  // Tour 1 : appariement par seed
  const firstRoundCount = size / 2;
  for (let p = 0; p < firstRoundCount; p++) {
    const seedA = order[p * 2] - 1;
    const seedB = order[p * 2 + 1] - 1;
    matches.push({
      key: `W-1-${p}`,
      round: 1,
      position: p,
      side: 'WINNERS',
      teamAId: teamIds[seedA] ?? null,
      teamBId: teamIds[seedB] ?? null,
      nextKey: rounds > 1 ? `W-2-${Math.floor(p / 2)}` : undefined,
      nextSlot: p % 2 === 0 ? 'A' : 'B',
    });
  }

  // Tours suivants
  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let p = 0; p < count; p++) {
      matches.push({
        key: `W-${r}-${p}`,
        round: r,
        position: p,
        side: 'WINNERS',
        nextKey: r < rounds ? `W-${r + 1}-${Math.floor(p / 2)}` : undefined,
        nextSlot: p % 2 === 0 ? 'A' : 'B',
      });
    }
  }

  return matches;
}

/**
 * Double élimination : winner bracket complet + loser bracket
 * en 2·(rounds-1) tours, puis grande finale.
 */
function buildDoubleElimination(teamIds: string[]): DraftMatch[] {
  const winners = buildSingleElimination(teamIds);
  const size = nextPowerOfTwo(teamIds.length);
  const wRounds = Math.log2(size);
  if (wRounds < 2) return winners;

  const losers: DraftMatch[] = [];
  const lRounds = (wRounds - 1) * 2;

  // Alternance : tours impairs = perdants du WB, tours pairs = consolidation.
  for (let lr = 1; lr <= lRounds; lr++) {
    const count = lr % 2 === 1 ? size / 2 ** (Math.floor((lr + 1) / 2) + 1) : size / 2 ** (lr / 2 + 1);
    for (let p = 0; p < Math.max(1, count); p++) {
      losers.push({
        key: `L-${lr}-${p}`,
        round: lr,
        position: p,
        side: 'LOSERS',
        nextKey: lr < lRounds ? `L-${lr + 1}-${Math.floor(p / 2)}` : 'GF-1-0',
        nextSlot: lr < lRounds ? (p % 2 === 0 ? 'A' : 'B') : 'B',
      });
    }
  }

  // Les perdants du winner bracket alimentent le loser bracket.
  for (const m of winners) {
    const targetRound = m.round === 1 ? 1 : (m.round - 1) * 2;
    const candidates = losers.filter((l) => l.round === targetRound);
    if (candidates.length === 0) continue;
    const target = candidates[m.position % candidates.length];
    m.loserKey = target.key;
    m.loserSlot = m.position % 2 === 0 ? 'A' : 'B';
  }

  const wFinal = winners.find((m) => m.round === wRounds);
  if (wFinal) {
    wFinal.nextKey = 'GF-1-0';
    wFinal.nextSlot = 'A';
  }

  return [
    ...winners,
    ...losers,
    { key: 'GF-1-0', round: 1, position: 0, side: 'GRAND_FINAL' as const },
  ];
}

/**
 * Génère (ou régénère) l'arbre d'un tournoi à partir de ses équipes
 * confirmées. Opération transactionnelle : l'ancien arbre est purgé.
 */
export async function generateBracket(
  tournamentId: string,
  options: { type?: BracketType; bestOf?: number } = {},
) {
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
    include: {
      teams: { orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }] },
    },
  });

  const type = options.type ?? tournament.bracketType;
  const teamIds = tournament.teams.map((t) => t.id);
  if (teamIds.length < 2) {
    throw new Error('Il faut au moins 2 équipes inscrites pour générer un arbre.');
  }

  const drafts =
    type === 'DOUBLE_ELIMINATION'
      ? buildDoubleElimination(teamIds)
      : buildSingleElimination(teamIds);

  const roundsCount = Math.max(...drafts.map((d) => d.round));

  return prisma.$transaction(async (tx) => {
    const bracket = await tx.bracket.upsert({
      where: { id: tournamentId },
      update: { type, status: 'SEEDING', roundsCount },
      create: {
        id: tournamentId,
        tournamentId,
        name: `${tournament.name} — Arbre principal`,
        type,
        status: 'SEEDING',
        roundsCount,
      },
    });

    await tx.match.deleteMany({ where: { bracketId: bracket.id } });

    // Passe 1 : créer les matchs sans les liens de progression.
    const idByKey = new Map<string, string>();
    for (const d of drafts) {
      const created = await tx.match.create({
        data: {
          bracketId: bracket.id,
          round: d.round,
          position: d.position,
          side: d.side,
          bestOf: options.bestOf ?? 1,
          teamAId: d.teamAId ?? null,
          teamBId: d.teamBId ?? null,
          status: d.teamAId && d.teamBId ? 'READY' : 'PENDING',
        },
      });
      idByKey.set(d.key, created.id);
    }

    // Passe 2 : câbler next_match / loser_match.
    for (const d of drafts) {
      const data: Prisma.MatchUpdateInput = {};
      if (d.nextKey && idByKey.has(d.nextKey)) {
        data.nextMatch = { connect: { id: idByKey.get(d.nextKey)! } };
        data.nextMatchSlot = d.nextSlot ?? 'A';
      }
      if (d.loserKey && idByKey.has(d.loserKey)) {
        data.loserMatch = { connect: { id: idByKey.get(d.loserKey)! } };
        data.loserMatchSlot = d.loserSlot ?? 'A';
      }
      if (Object.keys(data).length > 0) {
        await tx.match.update({ where: { id: idByKey.get(d.key)! }, data });
      }
    }

    // Passe 3 : résoudre les byes du premier tour.
    const firstRound = drafts.filter((d) => d.round === 1 && d.side === 'WINNERS');
    for (const d of firstRound) {
      const solo = (d.teamAId && !d.teamBId) || (!d.teamAId && d.teamBId);
      if (!solo) continue;
      const winnerId = d.teamAId ?? d.teamBId!;
      await tx.match.update({
        where: { id: idByKey.get(d.key)! },
        data: { winnerId, status: 'WALKOVER' },
      });
      if (d.nextKey && idByKey.has(d.nextKey)) {
        await tx.match.update({
          where: { id: idByKey.get(d.nextKey)! },
          data: d.nextSlot === 'B' ? { teamBId: winnerId } : { teamAId: winnerId },
        });
      }
    }

    await tx.bracket.update({ where: { id: bracket.id }, data: { status: 'RUNNING' } });
    return bracket;
  });
}

/**
 * Enregistre un score et fait progresser les équipes.
 * Réplique en applicatif ce que fait le trigger SQL `propagate_match_result`,
 * pour que le comportement soit identique via Prisma seul.
 */
export async function reportMatchResult(
  matchId: string,
  scoreA: number,
  scoreB: number,
  reportedById: string,
) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    if (!match.teamAId || !match.teamBId) {
      throw new Error('Les deux participants ne sont pas encore connus.');
    }
    if (scoreA === scoreB) {
      throw new Error('Un match ne peut pas se terminer sur une égalité.');
    }

    const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
    const loserId = scoreA > scoreB ? match.teamBId : match.teamAId;

    const updated = await tx.match.update({
      where: { id: matchId },
      data: { scoreA, scoreB, winnerId, status: 'COMPLETED', reportedById },
    });

    if (match.nextMatchId) {
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: match.nextMatchSlot === 'B' ? { teamBId: winnerId } : { teamAId: winnerId },
      });
    }
    if (match.loserMatchId) {
      await tx.match.update({
        where: { id: match.loserMatchId },
        data: match.loserMatchSlot === 'B' ? { teamBId: loserId } : { teamAId: loserId },
      });
    }

    // Les matchs dont les deux slots sont désormais remplis passent READY.
    const touched = [match.nextMatchId, match.loserMatchId].filter(Boolean) as string[];
    if (touched.length) {
      await tx.match.updateMany({
        where: {
          id: { in: touched },
          status: 'PENDING',
          teamAId: { not: null },
          teamBId: { not: null },
        },
        data: { status: 'READY' },
      });
    }

    // Plus aucun match ouvert => tournoi terminé.
    const remaining = await tx.match.count({
      where: { bracketId: match.bracketId, status: { in: ['PENDING', 'READY', 'IN_PROGRESS'] } },
    });
    if (remaining === 0) {
      await tx.bracket.update({ where: { id: match.bracketId }, data: { status: 'COMPLETED' } });
    }

    await tx.auditLog.create({
      data: {
        actorId: reportedById,
        action: 'match.report',
        entityType: 'match',
        entityId: matchId,
        payload: { scoreA, scoreB, winnerId },
      },
    });

    return updated;
  });
}
