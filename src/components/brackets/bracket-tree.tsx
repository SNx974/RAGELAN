'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Crown, Check, Minus, Swords, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BracketMatch = {
  id: string;
  round: number;
  position: number;
  side: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL' | 'GROUP';
  bestOf: number;
  scoreA: number;
  scoreB: number;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'WALKOVER' | 'CANCELLED';
  winnerId: string | null;
  teamA: { id: string; name: string; tag: string | null; seed: number | null } | null;
  teamB: { id: string; name: string; tag: string | null; seed: number | null } | null;
  nextMatchId: string | null;
  stationLabel: string | null;
};

type Props = {
  matches: BracketMatch[];
  /** Fourni côté admin/staff : ouvre la saisie de score au clic. */
  onReport?: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
  editable?: boolean;
};

function roundLabel(round: number, totalRounds: number, side: BracketMatch['side']) {
  if (side === 'GRAND_FINAL') return 'Grande finale';
  const fromEnd = totalRounds - round;
  if (side === 'LOSERS') return `Loser · Tour ${round}`;
  if (fromEnd === 0) return 'Finale';
  if (fromEnd === 1) return 'Demi-finales';
  if (fromEnd === 2) return 'Quarts de finale';
  if (fromEnd === 3) return 'Huitièmes';
  return `Tour ${round}`;
}

export function BracketTree({ matches, onReport, editable = false }: Props) {
  const [selected, setSelected] = useState<BracketMatch | null>(null);

  // Regroupement par côté d'arbre puis par tour.
  const columns = useMemo(() => {
    const bySide = new Map<BracketMatch['side'], Map<number, BracketMatch[]>>();
    for (const m of matches) {
      if (!bySide.has(m.side)) bySide.set(m.side, new Map());
      const rounds = bySide.get(m.side)!;
      if (!rounds.has(m.round)) rounds.set(m.round, []);
      rounds.get(m.round)!.push(m);
    }
    for (const rounds of bySide.values()) {
      for (const list of rounds.values()) list.sort((a, b) => a.position - b.position);
    }
    return bySide;
  }, [matches]);

  const champion = useMemo(() => {
    const finals = matches
      .filter((m) => m.status === 'COMPLETED' && !m.nextMatchId)
      .sort((a, b) => b.round - a.round);
    const final = finals.find((m) => m.side === 'GRAND_FINAL') ?? finals[0];
    if (!final) return null;
    return final.winnerId === final.teamA?.id ? final.teamA : final.teamB;
  }, [matches]);

  const sides: BracketMatch['side'][] = ['WINNERS', 'LOSERS', 'GRAND_FINAL'];

  return (
    <LayoutGroup>
      <div className="space-y-10">
        <AnimatePresence>
          {champion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="glass-card relative overflow-hidden px-8 py-8 text-center"
            >
              <div aria-hidden className="absolute inset-0 bg-rage-gradient opacity-[0.15]" />
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mx-auto mb-3 w-fit"
              >
                <Crown className="size-10 text-rage-yellow drop-shadow-[0_0_22px_rgba(255,199,0,.7)]" />
              </motion.div>
              <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-rage-yellow">
                Vainqueur
              </p>
              <p className="relative mt-1.5 font-display text-4xl font-bold text-rage-animated">
                {champion.name}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {sides.map((side) => {
          const rounds = columns.get(side);
          if (!rounds || rounds.size === 0) return null;
          const totalRounds = Math.max(...rounds.keys());

          return (
            <div key={side}>
              {side !== 'WINNERS' && (
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
                  {side === 'LOSERS' ? 'Loser bracket' : 'Finale'}
                </h3>
              )}
              <div className="overflow-x-auto pb-4">
                <div className="flex min-w-max gap-8">
                  {Array.from(rounds.keys())
                    .sort((a, b) => a - b)
                    .map((round, colIndex) => (
                      <div key={round} className="flex flex-col justify-around gap-4">
                        <motion.p
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: colIndex * 0.08 }}
                          className="mb-1 whitespace-nowrap text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40"
                        >
                          {roundLabel(round, totalRounds, side)}
                        </motion.p>
                        {rounds.get(round)!.map((match, i) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            delay={colIndex * 0.09 + i * 0.04}
                            editable={editable}
                            onSelect={() => editable && setSelected(match)}
                          />
                        ))}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onReport && (
        <ScoreDialog
          match={selected}
          onClose={() => setSelected(null)}
          onSubmit={async (a, b) => {
            if (!selected) return;
            await onReport(selected.id, a, b);
            setSelected(null);
          }}
        />
      )}
    </LayoutGroup>
  );
}

function MatchCard({
  match,
  delay,
  editable,
  onSelect,
}: {
  match: BracketMatch;
  delay: number;
  editable: boolean;
  onSelect: () => void;
}) {
  const done = match.status === 'COMPLETED' || match.status === 'WALKOVER';
  const live = match.status === 'IN_PROGRESS';

  return (
    <motion.button
      type="button"
      layout
      layoutId={`match-${match.id}`}
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={editable ? { scale: 1.03, y: -2 } : undefined}
      onClick={onSelect}
      disabled={!editable}
      className={cn(
        'group relative w-[248px] overflow-hidden rounded-xl border text-left transition-all duration-300',
        'border-white/[0.08] bg-white/[0.025] backdrop-blur',
        editable && 'cursor-pointer hover:border-rage-orange/50 hover:shadow-neon',
        live && 'border-rage-red/50 shadow-neon',
        done && 'border-white/[0.12]',
      )}
    >
      {live && (
        <motion.div
          aria-hidden
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="absolute inset-0 bg-rage-red/10"
        />
      )}

      <div className="relative flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
          {match.stationLabel ?? `BO${match.bestOf}`}
        </span>
        <StatusPill status={match.status} />
      </div>

      <TeamRow
        team={match.teamA}
        score={match.scoreA}
        isWinner={done && match.winnerId === match.teamA?.id}
        isLoser={done && match.winnerId !== match.teamA?.id}
      />
      <div className="mx-3 h-px bg-white/[0.06]" />
      <TeamRow
        team={match.teamB}
        score={match.scoreB}
        isWinner={done && match.winnerId === match.teamB?.id}
        isLoser={done && match.winnerId !== match.teamB?.id}
      />
    </motion.button>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  isLoser,
}: {
  team: BracketMatch['teamA'];
  score: number;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-2 px-3 py-2.5 transition-colors',
        isLoser && 'opacity-40',
      )}
    >
      {isWinner && (
        <motion.span
          layoutId={`winner-bar-${team?.id}`}
          className="absolute inset-y-0 left-0 w-[3px] bg-rage-gradient"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      {team?.seed != null && (
        <span className="w-4 shrink-0 text-[10px] font-bold text-white/25">{team.seed}</span>
      )}

      <span
        className={cn(
          'flex-1 truncate text-sm font-semibold',
          team ? 'text-white' : 'italic text-white/25',
          isWinner && 'text-rage-yellow',
        )}
      >
        {team ? (team.tag ? `[${team.tag}] ${team.name}` : team.name) : 'À déterminer'}
      </span>

      <AnimatePresence mode="popLayout">
        <motion.span
          key={score}
          initial={{ scale: 1.6, opacity: 0, color: '#FFC700' }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'w-6 text-right font-display text-sm font-bold tabular-nums',
            isWinner ? 'text-rage-yellow' : 'text-white/45',
          )}
        >
          {score}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ status }: { status: BracketMatch['status'] }) {
  const map = {
    PENDING: { icon: Minus, label: 'En attente', cls: 'text-white/25' },
    READY: { icon: Swords, label: 'Prêt', cls: 'text-rage-orange' },
    IN_PROGRESS: { icon: Loader2, label: 'En cours', cls: 'text-rage-red animate-spin' },
    COMPLETED: { icon: Check, label: 'Terminé', cls: 'text-emerald-400' },
    WALKOVER: { icon: Check, label: 'WO', cls: 'text-white/35' },
    CANCELLED: { icon: Minus, label: 'Annulé', cls: 'text-white/25' },
  } as const;
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
      <Icon className={cn('size-3', cls)} />
      {label}
    </span>
  );
}

function ScoreDialog({
  match,
  onClose,
  onSubmit,
}: {
  match: BracketMatch | null;
  onClose: () => void;
  onSubmit: (a: number, b: number) => Promise<void>;
}) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [pending, setPending] = useState(false);

  const ready = match?.teamA && match?.teamB && a !== b;

  return (
    <AnimatePresence>
      {match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-md p-7"
          >
            <h3 className="font-display text-xl font-bold text-white">Saisir le score</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Le vainqueur sera propagé automatiquement au tour suivant.
            </p>

            <div className="mt-6 space-y-3">
              {[
                { team: match.teamA, value: a, set: setA },
                { team: match.teamB, value: b, set: setB },
              ].map(({ team, value, set }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/30 p-3"
                >
                  <span className="flex-1 truncate text-sm font-semibold text-white">
                    {team?.name ?? 'À déterminer'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => set(Number(e.target.value))}
                    className="h-10 w-16 rounded-lg border border-white/10 bg-black/50 text-center font-display text-lg font-bold text-white focus:border-rage-orange focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {a === b && (
              <p className="mt-3 text-xs text-rage-red">
                Les scores ne peuvent pas être à égalité.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="h-11 flex-1 rounded-xl border border-white/12 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                disabled={!ready || pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await onSubmit(a, b);
                  } finally {
                    setPending(false);
                  }
                }}
                className="h-11 flex-1 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
              >
                {pending ? 'Validation…' : 'Valider'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
