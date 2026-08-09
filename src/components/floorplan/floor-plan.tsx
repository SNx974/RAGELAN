'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Armchair, X, UserRound } from 'lucide-react';
import { cn, initials } from '@/lib/utils';

export type PlanSeat = {
  id: string;
  seatLabel: string;
  tableLabel: string;
  zone: string;
  kind: 'PC' | 'CONSOLE' | 'TABLE_TCG' | 'STAFF' | 'FREEPLAY';
  x: number;
  y: number;
  occupant: {
    registrationId: string;
    userId: string;
    displayName: string;
    firstName: string;
    lastName: string;
    teamId: string | null;
    teamName: string | null;
  } | null;
};

export type PlanPlayer = {
  registrationId: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  teamId: string | null;
  teamName: string | null;
};

type Props = {
  seats: PlanSeat[];
  /** Joueurs inscrits pas encore placés. */
  unassigned: PlanPlayer[];
  tournamentName: string;
  accent?: string;
  onAssign?: (seatId: string, registrationId: string | null) => Promise<void>;
  readOnly?: boolean;
};

/** Palette stable par équipe : même équipe = même teinte. */
function teamHue(teamId: string | null) {
  if (!teamId) return null;
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) hash = (hash * 31 + teamId.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

export function FloorPlan({
  seats,
  unassigned,
  tournamentName,
  accent = '#FF6B00',
  onAssign,
  readOnly = false,
}: Props) {
  const planRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState<PlanPlayer | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<PlanSeat | null>(null);
  const [pendingSeat, setPendingSeat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.displayName} ${p.teamName ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [unassigned, query]);

  const occupied = seats.filter((s) => s.occupant).length;

  // Contours de table déduits des sièges (min/max des coordonnées).
  const tables = useMemo(() => {
    const map = new Map<string, { xs: number[]; ys: number[]; zone: string }>();
    for (const s of seats) {
      if (!map.has(s.tableLabel)) map.set(s.tableLabel, { xs: [], ys: [], zone: s.zone });
      map.get(s.tableLabel)!.xs.push(s.x);
      map.get(s.tableLabel)!.ys.push(s.y);
    }
    return Array.from(map.entries()).map(([label, { xs, ys, zone }]) => ({
      label,
      zone,
      left: Math.min(...xs) - 1.6,
      top: Math.min(...ys) - 0.4,
      width: Math.max(...xs) - Math.min(...xs) + 3.2,
      height: Math.max(Math.max(...ys) - Math.min(...ys) - 3.2, 2.4),
    }));
  }, [seats]);

  async function assign(seatId: string, registrationId: string | null) {
    if (!onAssign || readOnly) return;
    setPendingSeat(seatId);
    try {
      await onAssign(seatId, registrationId);
    } finally {
      setPendingSeat(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* ── Panneau joueurs non placés ─────────────────────── */}
      {!readOnly && (
        <aside className="glass-card flex max-h-[60vh] flex-col p-4 lg:max-h-[78vh]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              À placer
            </h3>
            <span className="rounded-full bg-rage-orange/15 px-2 py-0.5 text-[11px] font-bold text-rage-orange">
              {unassigned.length}
            </span>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un joueur…"
              className="h-10 w-full rounded-lg border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-rage-orange/60 focus:outline-none"
            />
          </div>

          <div className="-mr-2 flex-1 space-y-1.5 overflow-y-auto pr-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((player) => {
                const hue = teamHue(player.teamId);
                return (
                  <motion.div
                    key={player.registrationId}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.22 }}
                    draggable
                    onDragStart={() => setDragging(player)}
                    onDragEnd={() => setDragging(null)}
                    whileHover={{ scale: 1.02, x: 3 }}
                    className={cn(
                      'flex cursor-grab items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-2.5 active:cursor-grabbing',
                      dragging?.registrationId === player.registrationId &&
                        'border-rage-orange/60 opacity-50',
                    )}
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-md text-[11px] font-bold text-white"
                      style={{
                        background:
                          hue != null
                            ? `hsl(${hue} 70% 32%)`
                            : 'rgba(255,255,255,.08)',
                      }}
                    >
                      {initials(player.firstName, player.lastName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {player.displayName}
                      </p>
                      <p className="truncate text-[11px] text-white/40">
                        {player.teamName ?? 'Solo'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-white/30">
                {unassigned.length === 0 ? 'Tout le monde est placé 🎉' : 'Aucun résultat.'}
              </p>
            )}
          </div>

          <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-white/35">
            {/*
              Le glisser-déposer s'appuie sur l'API HTML5, qui ne réagit pas
              au tactile : sur mobile, seule la sélection par siège fonctionne.
            */}
            <span className="hidden lg:inline">
              Glisse un joueur sur un siège, ou clique un siège pour choisir dans la liste.
            </span>
            <span className="lg:hidden">
              Touche un siège pour y placer un joueur. Le glisser-déposer n&apos;est
              disponible qu&apos;au clavier-souris.
            </span>
          </p>
        </aside>
      )}

      {/* ── Le plan ────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-white">{tournamentName}</h2>
            <p className="text-xs text-white/40">
              {tables.length} tables · {seats.length} sièges
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-white/50">
              <Armchair className="size-3.5" /> {seats.length - occupied} libres
            </span>
            <span className="flex items-center gap-1.5 text-rage-orange">
              <Users className="size-3.5" /> {occupied} placés
            </span>
          </div>
        </div>

        {/*
          Les sièges sont positionnés en pourcentage. Sous ~700 px de large,
          ils se chevaucheraient (leur taille minimale dépasse l'espacement
          calculé) : on impose donc une largeur plancher et on laisse
          défiler horizontalement plutôt que d'écraser le plan.
        */}
        <div className="overflow-x-auto">
        <div
          ref={planRef}
          className="relative aspect-[16/11] w-full min-w-[700px] overflow-hidden bg-black/50 lg:min-w-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
            backgroundSize: '5% 5%',
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Tables */}
          {tables.map((t) => (
            <div
              key={t.label}
              className="absolute rounded-lg border border-white/[0.09] bg-white/[0.03]"
              style={{
                left: `${t.left}%`,
                top: `${t.top}%`,
                width: `${t.width}%`,
                height: `${t.height}%`,
              }}
            >
              <span className="absolute inset-0 grid place-items-center text-[9px] font-bold uppercase tracking-wider text-white/25">
                {t.label}
              </span>
            </div>
          ))}

          {/* Sièges */}
          {seats.map((seat) => {
            const hue = teamHue(seat.occupant?.teamId ?? null);
            const isHovered = hoveredSeat === seat.id;
            const isPending = pendingSeat === seat.id;
            const canDrop = !!dragging && !seat.occupant;

            return (
              <motion.button
                key={seat.id}
                type="button"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: Math.random() * 0.25,
                }}
                whileHover={{ scale: 1.35, zIndex: 20 }}
                whileTap={{ scale: 1.1 }}
                onClick={() => !readOnly && setSelectedSeat(seat)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoveredSeat(seat.id);
                }}
                onDragLeave={() => setHoveredSeat(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoveredSeat(null);
                  if (dragging && !seat.occupant) {
                    void assign(seat.id, dragging.registrationId);
                  }
                  setDragging(null);
                }}
                title={`${seat.seatLabel}${seat.occupant ? ` — ${seat.occupant.displayName}` : ' — libre'}`}
                className={cn(
                  'absolute grid size-[2.1%] min-h-[18px] min-w-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border text-[8px] font-bold transition-colors',
                  seat.occupant
                    ? 'border-white/20 text-white'
                    : 'border-white/12 bg-white/[0.04] text-white/25 hover:border-rage-orange hover:bg-rage-orange/20',
                  canDrop && 'border-rage-yellow/70 bg-rage-yellow/10',
                  isHovered && canDrop && 'scale-150 border-rage-yellow bg-rage-yellow/30',
                  isPending && 'animate-pulse',
                )}
                style={{
                  left: `${seat.x}%`,
                  top: `${seat.y}%`,
                  background: seat.occupant
                    ? hue != null
                      ? `hsl(${hue} 65% 38%)`
                      : accent
                    : undefined,
                }}
              >
                {seat.occupant
                  ? initials(seat.occupant.firstName, seat.occupant.lastName)
                  : seat.seatLabel.split('-').pop()}
              </motion.button>
            );
          })}

          {/* Légende */}
          <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg border border-white/[0.08] bg-black/70 px-3 py-2 text-[10px] text-white/50 backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm border border-white/15 bg-white/[0.04]" /> Libre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: accent }} /> Occupé
            </span>
          </div>
        </div>
        </div>
      </div>

      {/* ── Fiche siège ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSeat && (
          <SeatDialog
            seat={selectedSeat}
            players={filtered}
            onClose={() => setSelectedSeat(null)}
            onAssign={async (registrationId) => {
              await assign(selectedSeat.id, registrationId);
              setSelectedSeat(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SeatDialog({
  seat,
  players,
  onClose,
  onAssign,
}: {
  seat: PlanSeat;
  players: PlanPlayer[];
  onClose: () => void;
  onAssign: (registrationId: string | null) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const list = players.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.displayName}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.93, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.93, y: 18, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card flex max-h-[80vh] w-full max-w-md flex-col p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
              {seat.zone}
            </p>
            <h3 className="font-display text-2xl font-bold text-white">{seat.seatLabel}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5">
            <X className="size-5" />
          </button>
        </div>

        {seat.occupant ? (
          <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/30 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-rage-gradient text-sm font-bold text-black">
                {initials(seat.occupant.firstName, seat.occupant.lastName)}
              </span>
              <div>
                <p className="font-semibold text-white">{seat.occupant.displayName}</p>
                <p className="text-xs text-white/40">{seat.occupant.teamName ?? 'Solo'}</p>
              </div>
            </div>
            <button
              onClick={() => void onAssign(null)}
              className="mt-4 h-10 w-full rounded-lg border border-rage-red/40 text-sm font-semibold text-rage-red transition-colors hover:bg-rage-red/10"
            >
              Libérer la place
            </button>
          </div>
        ) : (
          <>
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Assigner un joueur…"
                className="h-11 w-full rounded-lg border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-rage-orange/60 focus:outline-none"
              />
            </div>
            <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
              {list.map((p) => (
                <button
                  key={p.registrationId}
                  onClick={() => void onAssign(p.registrationId)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 text-left transition-colors hover:border-rage-orange/50 hover:bg-white/[0.06]"
                >
                  <UserRound className="size-4 text-white/35" />
                  <span className="flex-1 truncate text-sm text-white">{p.displayName}</span>
                  <span className="truncate text-[11px] text-white/35">
                    {p.teamName ?? 'Solo'}
                  </span>
                </button>
              ))}
              {list.length === 0 && (
                <p className="py-6 text-center text-sm text-white/30">Aucun joueur disponible.</p>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
