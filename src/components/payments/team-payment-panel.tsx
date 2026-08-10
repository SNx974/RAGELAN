'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, CreditCard, Link2, Loader2, Users } from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import { TEAM_STATE_LABEL, refundNotice, teamPaymentState } from '@/lib/pricing';

export type ShareRow = {
  id: string;
  token: string;
  pseudo: string;
  fullName: string;
  amountCents: number;
  paid: boolean;
};

/**
 * Suivi et règlement d'une équipe : paiement intégral par le capitaine,
 * ou distribution d'un lien par joueur.
 */
export function TeamPaymentPanel({
  teamId,
  teamName,
  shares,
  teamSize,
  reserveThreshold,
  appUrl,
}: {
  teamId: string;
  teamName: string;
  shares: ShareRow[];
  teamSize: number;
  reserveThreshold: number;
  appUrl: string;
}) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const paidCount = shares.filter((s) => s.paid).length;
  const dueCents = shares.filter((s) => !s.paid).reduce((n, s) => n + s.amountCents, 0);
  const state = teamPaymentState(paidCount, { teamSize, reserveThreshold });

  async function payAll() {
    setPending(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Paiement indisponible.');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('Impossible de joindre le service de paiement.');
    } finally {
      setPending(false);
    }
  }

  async function copy(token: string, pseudo: string) {
    const url = `${appUrl}/paiement/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      toast.success(`Lien de ${pseudo} copié.`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard indisponible (http, permissions) : on montre l'URL
      toast.message(url);
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">{teamName}</h3>
          <p className="flex items-center gap-1.5 text-xs text-white/45">
            <Users className="size-3" />
            {paidCount} / {teamSize} parts réglées
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
            state === 'COMPLETE'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : state === 'RESERVED'
                ? 'border-rage-orange/30 bg-rage-orange/10 text-rage-orange'
                : 'border-white/12 bg-white/[0.04] text-white/50',
          )}
        >
          {TEAM_STATE_LABEL[state]}
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-rage-gradient transition-all duration-500"
            style={{ width: `${(paidCount / teamSize) * 100}%` }}
          />
        </div>

        <ul className="space-y-1.5">
          {shares.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
            >
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full',
                  s.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.06] text-white/25',
                )}
              >
                {s.paid ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                {s.pseudo}
                <span className="ml-2 text-xs font-normal text-white/35">{s.fullName}</span>
              </span>
              <span className={cn('text-xs font-semibold', s.paid ? 'text-emerald-400' : 'text-white/45')}>
                {s.paid ? 'Réglé' : formatPrice(s.amountCents)}
              </span>
              {!s.paid && (
                <button
                  onClick={() => copy(s.token, s.pseudo)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-white/12 px-2.5 text-[11px] font-semibold text-white/60 transition-colors hover:border-rage-orange/50 hover:text-white"
                >
                  {copied === s.token ? <Check className="size-3" /> : <Copy className="size-3" />}
                  Lien
                </button>
              )}
            </li>
          ))}
        </ul>

        {dueCents > 0 && (
          <>
            <button
              onClick={payAll}
              disabled={pending}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Tout régler — {formatPrice(dueCents)}
            </button>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-white/35">
              <Link2 className="mt-0.5 size-3.5 shrink-0" />
              Ou copie le lien de chaque joueur pour qu&apos;il règle sa part lui-même.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-rage-yellow/80">
              {refundNotice(reserveThreshold)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
