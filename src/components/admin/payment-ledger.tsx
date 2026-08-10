'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, ExternalLink, Search, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice } from '@/lib/utils';

export type LedgerRow = {
  id: string;
  kind: 'solo' | 'share';
  payer: string;
  email: string | null;
  tournamentName: string;
  teamName: string | null;
  reference: string | null;
  amountCents: number;
  status: string;
  method: string;
  stripeId: string | null;
  paidAt: string | null;
  createdAt: string;
};

const PAID = ['PAID', 'PAID_ONLINE', 'PAID_ON_SITE'];

/** Un identifiant Stripe est directement adressable dans le dashboard. */
function stripeUrl(id: string) {
  if (id.startsWith('pi_')) return `https://dashboard.stripe.com/payments/${id}`;
  if (id.startsWith('cs_')) return `https://dashboard.stripe.com/checkout/sessions/${id}`;
  return `https://dashboard.stripe.com/search?query=${encodeURIComponent(id)}`;
}

export function PaymentLedger({ rows }: { rows: LedgerRow[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'PAID' && !PAID.includes(r.status)) return false;
      if (filter === 'PENDING' && PAID.includes(r.status)) return false;
      if (!q) return true;
      return `${r.payer} ${r.email ?? ''} ${r.reference ?? ''} ${r.tournamentName} ${r.teamName ?? ''} ${r.stripeId ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, deferred, filter]);

  const encaisse = rows
    .filter((r) => PAID.includes(r.status))
    .reduce((n, r) => n + r.amountCents, 0);
  const attendu = rows
    .filter((r) => !PAID.includes(r.status) && r.status !== 'REFUNDED' && r.status !== 'CANCELLED')
    .reduce((n, r) => n + r.amountCents, 0);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Identifiant copié.');
    } catch {
      toast.message(value);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          Super admin
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Paiements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} mouvements · vérification manuelle via l&apos;identifiant Stripe.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card p-5">
          <Wallet className="size-5 text-emerald-400" />
          <p className="mt-3 font-display text-2xl font-bold text-white">
            {formatPrice(encaisse)}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-white/40">Encaissé</p>
        </div>
        <div className="glass-card p-5">
          <Users className="size-5 text-rage-yellow" />
          <p className="mt-3 font-display text-2xl font-bold text-white">{formatPrice(attendu)}</p>
          <p className="text-[11px] uppercase tracking-wider text-white/40">Encore attendu</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, référence, email, ID Stripe…"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:border-rage-orange/60 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ['ALL', 'Tous'],
              ['PAID', 'Réglés'],
              ['PENDING', 'En attente'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === k
                  ? 'bg-rage-gradient text-black'
                  : 'border border-white/10 text-white/50 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card divide-y divide-white/[0.05] overflow-hidden">
        {filtered.slice(0, 200).map((r) => (
          <div key={`${r.kind}-${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{r.payer}</span>
                <Badge variant={PAID.includes(r.status) ? 'success' : r.status === 'REFUNDED' ? 'red' : 'neutral'}>
                  {r.status}
                </Badge>
                {r.kind === 'share' && <Badge variant="default">Part d&apos;équipe</Badge>}
              </div>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {r.tournamentName}
                {r.teamName && ` · ${r.teamName}`}
                {r.reference && ` · ${r.reference}`}
                {r.email && ` · ${r.email}`}
              </p>
              {r.stripeId && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="truncate font-mono text-[11px] text-white/35">
                    {r.stripeId}
                  </code>
                  <button
                    onClick={() => copy(r.stripeId!)}
                    className="text-white/30 transition-colors hover:text-white"
                    aria-label="Copier l'identifiant"
                  >
                    <Copy className="size-3" />
                  </button>
                  <a
                    href={stripeUrl(r.stripeId)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-rage-orange hover:underline"
                  >
                    Stripe
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="font-display text-lg font-bold text-white">
                {formatPrice(r.amountCents)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/35">
                {r.method}
              </p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-14 text-center text-sm text-white/30">Aucun mouvement.</p>
        )}
      </div>

      {filtered.length > 200 && (
        <p className="text-center text-xs text-white/30">
          {filtered.length - 200} mouvements supplémentaires — affine la recherche.
        </p>
      )}
    </div>
  );
}
