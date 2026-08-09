'use client';

import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, CheckCircle2, Banknote, CreditCard, Armchair, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { checkInRegistration, collectOnSitePayment } from '@/app/actions/registrations';
import { cn, formatPrice } from '@/lib/utils';

/** Initiales depuis un nom complet ("Léa Martin" → "LM"). */
function rowInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
}

export type CheckInRow = {
  id: string;
  fullName: string;
  pseudo: string | null;
  phone: string;
  tournamentName: string;
  accent: string;
  entryFeeCents: number;
  teamName: string | null;
  seatLabel: string | null;
  status: string;
  paymentStatus: string;
};

const PAID = ['PAID_ONLINE', 'PAID_ON_SITE'];

export function CheckInConsole({ rows }: { rows: CheckInRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'DONE' | 'UNPAID'>('ALL');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Recherche instantanée : `useDeferredValue` garde la frappe fluide
  // même avec un millier de lignes.
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'TODO' && r.status === 'CHECKED_IN') return false;
      if (filter === 'DONE' && r.status !== 'CHECKED_IN') return false;
      if (filter === 'UNPAID' && PAID.includes(r.paymentStatus)) return false;
      if (!q) return true;
      return `${r.fullName} ${r.pseudo ?? ''} ${r.teamName ?? ''} ${r.phone} ${r.seatLabel ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, deferredQuery, filter]);

  const checkedIn = rows.filter((r) => r.status === 'CHECKED_IN').length;

  function doCheckIn(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await checkInRegistration(id);
        toast.success('Joueur validé sur place.');
        router.refresh();
      } catch {
        toast.error('Check-in impossible.');
      } finally {
        setPendingId(null);
      }
    });
  }

  function doCollect(id: string, method: 'cash' | 'card_on_site') {
    setPendingId(id);
    startTransition(async () => {
      try {
        await collectOnSitePayment(id, method);
        toast.success('Paiement encaissé.');
        router.refresh();
      } catch {
        toast.error('Encaissement impossible.');
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="container space-y-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
            Jour J
          </p>
          <h1 className="font-display text-3xl font-bold text-white">Check-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {checkedIn} / {rows.length} joueurs présents
          </p>
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ['ALL', 'Tous'],
              ['TODO', 'À valider'],
              ['DONE', 'Présents'],
              ['UNPAID', 'Impayés'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === key
                  ? 'bg-rage-gradient text-black'
                  : 'border border-white/10 text-white/50 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/30" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, pseudo, équipe, téléphone ou n° de place…"
          className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 pl-12 pr-4 text-base text-white placeholder:text-white/30 focus:border-rage-orange/60 focus:shadow-neon focus:outline-none"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.slice(0, 120).map((row) => {
            const paid = PAID.includes(row.paymentStatus);
            const present = row.status === 'CHECKED_IN';
            const busy = pendingId === row.id;

            return (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'glass-card flex flex-wrap items-center gap-4 p-4 transition-all',
                  present && 'border-emerald-500/25 bg-emerald-500/[0.04]',
                  busy && 'opacity-60',
                )}
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                  style={{ background: `${row.accent}33`, border: `1px solid ${row.accent}55` }}
                >
                  {rowInitials(row.fullName)}
                </span>

                <div className="min-w-[180px] flex-1">
                  <p className="font-semibold text-white">
                    {row.fullName}
                    {row.pseudo && <span className="text-white/40"> · {row.pseudo}</span>}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                    <span>{row.tournamentName}</span>
                    {row.teamName && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {row.teamName}
                      </span>
                    )}
                    {row.seatLabel && (
                      <span className="flex items-center gap-1 font-semibold text-rage-orange">
                        <Armchair className="size-3" />
                        {row.seatLabel}
                      </span>
                    )}
                    <span>{row.phone}</span>
                  </div>
                </div>

                <Badge variant={paid ? 'success' : 'red'}>
                  {paid ? 'Réglé' : `Doit ${formatPrice(row.entryFeeCents)}`}
                </Badge>

                <div className="flex gap-2">
                  {!paid && (
                    <>
                      <button
                        onClick={() => doCollect(row.id, 'cash')}
                        disabled={busy}
                        className="flex h-10 items-center gap-1.5 rounded-lg border border-rage-yellow/35 px-3 text-xs font-semibold text-rage-yellow transition-colors hover:bg-rage-yellow/10"
                      >
                        <Banknote className="size-4" />
                        Espèces
                      </button>
                      <button
                        onClick={() => doCollect(row.id, 'card_on_site')}
                        disabled={busy}
                        className="flex h-10 items-center gap-1.5 rounded-lg border border-rage-yellow/35 px-3 text-xs font-semibold text-rage-yellow transition-colors hover:bg-rage-yellow/10"
                      >
                        <CreditCard className="size-4" />
                        CB
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => doCheckIn(row.id)}
                    disabled={busy || present}
                    className={cn(
                      'flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-all',
                      present
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-rage-gradient text-black shadow-neon hover:brightness-110',
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                    {present ? 'Présent' : 'Valider'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-white/30">Aucun joueur trouvé.</p>
        )}
        {filtered.length > 120 && (
          <p className="py-4 text-center text-xs text-white/30">
            {filtered.length - 120} résultats supplémentaires — affine ta recherche.
          </p>
        )}
      </div>
    </div>
  );
}
