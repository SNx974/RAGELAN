'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle2, CreditCard, Loader2, Shield, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { refundNotice, teamPaymentState, TEAM_STATE_LABEL } from '@/lib/pricing';
import { Notice } from './shared';
import { cn } from '@/lib/utils';

export function SharePaymentPanel(props: {
  token: string;
  alreadyPaid: boolean;
  amountCents: number;
  playerName: string;
  playerPseudo: string;
  teamName: string;
  teamTag: string | null;
  hasLogo: boolean;
  teamId: string;
  tournamentName: string;
  formatLabel: string;
  accent: string;
  paidCount: number;
  teamSize: number;
  reserveThreshold: number;
}) {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);

  // Stripe renvoie ici après paiement ; le webhook fait foi, mais le
  // joueur doit voir tout de suite que c'est passé.
  const justPaid = params.get('paye') === '1';
  const paid = props.alreadyPaid || justPaid;

  const state = teamPaymentState(props.paidCount, {
    teamSize: props.teamSize,
    reserveThreshold: props.reserveThreshold,
  });

  async function pay() {
    setPending(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: props.token }),
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

  return (
    <div className="container max-w-lg py-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card overflow-hidden"
      >
        <div
          className="px-6 py-5"
          style={{ background: `linear-gradient(135deg, ${props.accent}22, transparent)` }}
        >
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {props.hasLogo ? (
                // eslint-disable-next-line @next/next/no-img-element -- route dynamique
                <img src={`/api/teams/${props.teamId}/logo`} alt="" className="size-full object-contain p-1" />
              ) : (
                <Shield className="size-5 text-white/20" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-white">
                {props.teamTag && <span className="text-white/35">[{props.teamTag}] </span>}
                {props.teamName}
              </h1>
              <p className="text-xs text-white/45">
                {props.tournamentName} · {props.formatLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.07] px-6 py-5">
          <p className="text-xs uppercase tracking-wider text-white/35">Part de</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">
            {props.playerPseudo}
          </p>
          <p className="text-sm text-white/45">{props.playerName}</p>

          <div className="mt-5 flex items-baseline justify-between border-t border-white/[0.06] pt-4">
            <span className="text-sm text-white/45">Montant</span>
            <span className="font-display text-3xl font-bold text-rage-orange">
              {formatPrice(props.amountCents)}
            </span>
          </div>
        </div>

        {/* Avancement de l'équipe */}
        <div className="border-t border-white/[0.07] px-6 py-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-white/45">
              <Users className="size-3.5" />
              {props.paidCount} / {props.teamSize} parts réglées
            </span>
            <span
              className={cn(
                'font-semibold',
                state === 'COMPLETE'
                  ? 'text-emerald-400'
                  : state === 'RESERVED'
                    ? 'text-rage-orange'
                    : 'text-white/40',
              )}
            >
              {TEAM_STATE_LABEL[state]}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-rage-gradient transition-all"
              style={{ width: `${(props.paidCount / props.teamSize) * 100}%` }}
            />
          </div>
        </div>

        <div className="border-t border-white/[0.07] p-6">
          {paid ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5 text-sm font-semibold text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              Ta part est réglée. Rien d’autre à faire.
            </div>
          ) : (
            <>
              <button
                onClick={pay}
                disabled={pending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                {pending ? 'Redirection…' : `Payer ${formatPrice(props.amountCents)}`}
              </button>
              <div className="mt-4">
                <Notice>{refundNotice(props.reserveThreshold)}</Notice>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
