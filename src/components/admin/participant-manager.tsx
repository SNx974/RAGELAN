'use client';

import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Clock, Search, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { deleteRegistration, setRegistrationStatus } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

export type ParticipantRow = {
  id: string;
  reference: string;
  fullName: string;
  pseudo: string | null;
  email: string;
  phone: string;
  tournamentId: string;
  tournamentName: string;
  accent: string;
  teamName: string | null;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Inscrit',
  CONFIRMED: 'Confirmé',
  WAITLIST: 'Liste d’attente',
  CHECKED_IN: 'Présent',
  CANCELLED: 'Annulé',
  NO_SHOW: 'Absent',
};

export function ParticipantManager({
  rows,
  tournaments,
}: {
  rows: ParticipantRow[];
  tournaments: { id: string; name: string; maxPlayers: number }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tournamentId, setTournamentId] = useState('ALL');
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return rows.filter((r) => {
      if (tournamentId !== 'ALL' && r.tournamentId !== tournamentId) return false;
      if (!q) return true;
      return `${r.fullName} ${r.pseudo ?? ''} ${r.email} ${r.reference} ${r.teamName ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, deferred, tournamentId]);

  const counts = useMemo(() => {
    const scope = tournamentId === 'ALL' ? rows : rows.filter((r) => r.tournamentId === tournamentId);
    return {
      inscrits: scope.filter((r) => ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(r.status)).length,
      attente: scope.filter((r) => r.status === 'WAITLIST').length,
      capacite: tournaments.find((t) => t.id === tournamentId)?.maxPlayers ?? null,
    };
  }, [rows, tournamentId, tournaments]);

  function changeStatus(row: ParticipantRow, status: 'PENDING' | 'CONFIRMED' | 'WAITLIST' | 'CANCELLED') {
    setBusy(row.id);
    startTransition(async () => {
      const res = await setRegistrationStatus(row.id, status);
      if ('error' in res && res.error) toast.error(String(res.error));
      else {
        toast.success(
          res.promoted > 0
            ? `${row.fullName} → ${STATUS_LABEL[status]} · ${res.promoted} promu(s) depuis la liste d’attente`
            : `${row.fullName} → ${STATUS_LABEL[status]}`,
        );
        router.refresh();
      }
      setBusy(null);
    });
  }

  function remove(row: ParticipantRow) {
    setBusy(row.id);
    startTransition(async () => {
      const res = await deleteRegistration(row.id);
      setBusy(null);

      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.promoted > 0
          ? `Inscription supprimée · ${res.promoted} promu(s) depuis la liste d’attente`
          : 'Inscription supprimée.',
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          Gestion
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Participants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.inscrits} inscrits
          {counts.capacite !== null && ` / ${counts.capacite} places`} ·{' '}
          {counts.attente} en liste d&apos;attente. Retirer quelqu&apos;un promeut
          automatiquement le premier en attente.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, pseudo, référence, équipe…"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:border-rage-orange/60 focus:outline-none"
          />
        </div>
        <select
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          className="h-12 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-rage-orange/60 focus:outline-none"
        >
          <option value="ALL">Tous les tournois</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 200).map((r) => (
          <motion.div
            key={r.id}
            layout
            className={cn('glass-card flex flex-wrap items-center gap-3 p-4', busy === r.id && 'opacity-60')}
          >
            <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: r.accent }} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{r.fullName}</span>
                {r.pseudo && <span className="text-xs text-white/35">{r.pseudo}</span>}
                <Badge
                  variant={
                    r.status === 'CHECKED_IN' || r.status === 'CONFIRMED'
                      ? 'success'
                      : r.status === 'WAITLIST'
                        ? 'yellow'
                        : r.status === 'CANCELLED'
                          ? 'red'
                          : 'neutral'
                  }
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {r.tournamentName}
                {r.teamName && ` · ${r.teamName}`}
                {' · '}
                <span className="font-mono">{r.reference}</span>
                {' · '}
                {r.email}
              </p>
            </div>

            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <button
                onClick={() => changeStatus(r, 'PENDING')}
                disabled={busy === r.id || r.status === 'PENDING'}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs font-semibold text-white/70 hover:border-emerald-500/50 hover:text-white disabled:opacity-30 sm:flex-none"
              >
                <Check className="size-3.5" />
                Inscrit
              </button>
              <button
                onClick={() => changeStatus(r, 'WAITLIST')}
                disabled={busy === r.id || r.status === 'WAITLIST'}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs font-semibold text-white/70 hover:border-rage-yellow/50 hover:text-white disabled:opacity-30 sm:flex-none"
              >
                <Clock className="size-3.5" />
                Attente
              </button>
              <button
                onClick={() => remove(r)}
                disabled={busy === r.id}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-rage-red/40 px-3 text-xs font-semibold text-rage-red hover:bg-rage-red/10"
              >
                <Trash2 className="size-3.5" />
                Supprimer
              </button>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="glass-card grid place-items-center px-6 py-16 text-center">
            <Users className="mb-3 size-9 text-white/15" />
            <p className="text-sm text-white/40">Aucun participant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
