'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, X, Mail, Phone, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { reviewRegistration } from '@/app/actions/admin';
import { cn, formatPrice } from '@/lib/utils';

export type SoloRegistration = {
  id: string;
  fullName: string;
  pseudo: string | null;
  email: string;
  phone: string;
  ign: string | null;
  notes: string | null;
  tournamentName: string;
  accent: string;
  entryFeeCents: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

const PAID = ['PAID_ONLINE', 'PAID_ON_SITE'];

export function SoloRegistrationList({ registrations }: { registrations: SoloRegistration[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const shown = useMemo(
    () => (filter === 'PENDING' ? registrations.filter((r) => r.status === 'PENDING') : registrations),
    [registrations, filter],
  );
  const pending = registrations.filter((r) => r.status === 'PENDING').length;

  function decide(r: SoloRegistration, decision: 'CONFIRMED' | 'CANCELLED') {
    setBusy(r.id);
    startTransition(async () => {
      const res = await reviewRegistration(r.id, decision);
      if ('error' in res && res.error) toast.error(String(res.error));
      else {
        toast.success(
          decision === 'CONFIRMED'
            ? `${r.fullName} confirmé — e-mail envoyé.`
            : `${r.fullName} refusé — e-mail envoyé.`,
        );
        router.refresh();
      }
      setBusy(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
            Joueurs solo
          </p>
          <h1 className="font-display text-3xl font-bold text-white">Inscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pending} en attente · {registrations.length} au total. Les inscriptions en équipe
            se traitent depuis « Équipes à valider ».
          </p>
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ['PENDING', 'À traiter'],
              ['ALL', 'Toutes'],
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

      {shown.length === 0 ? (
        <div className="glass-card grid place-items-center px-6 py-20 text-center">
          <Check className="mb-3 size-9 text-emerald-400/50" />
          <p className="font-display text-lg font-bold text-white">Rien à traiter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <motion.div
              key={r.id}
              layout
              className={cn(
                'glass-card flex flex-wrap items-center gap-4 p-4',
                busy === r.id && 'opacity-60',
              )}
            >
              <span
                className="h-10 w-1 shrink-0 rounded-full"
                style={{ background: r.accent }}
              />

              <div className="min-w-0 flex-1 sm:min-w-[180px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{r.fullName}</span>
                  {r.pseudo && <span className="text-xs text-white/35">{r.pseudo}</span>}
                  <Badge
                    variant={
                      r.status === 'CONFIRMED'
                        ? 'success'
                        : r.status === 'CANCELLED'
                          ? 'red'
                          : r.status === 'WAITLIST'
                            ? 'yellow'
                            : 'neutral'
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-white/40">
                  {r.tournamentName}
                  {r.ign && ` · ${r.ign}`}
                  {r.notes && ` · ${r.notes}`}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                  <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 hover:text-rage-orange">
                    <Mail className="size-3" />
                    {r.email}
                  </a>
                  <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:text-rage-orange">
                    <Phone className="size-3" />
                    {r.phone}
                  </a>
                </div>
              </div>

              <Badge variant={PAID.includes(r.paymentStatus) ? 'success' : 'red'}>
                {PAID.includes(r.paymentStatus) ? 'Réglé' : formatPrice(r.entryFeeCents)}
              </Badge>

              {r.status === 'PENDING' && (
                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    onClick={() => decide(r, 'CANCELLED')}
                    disabled={busy === r.id}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rage-red/40 px-3 text-xs font-semibold text-rage-red hover:bg-rage-red/10 sm:h-10 sm:flex-none"
                  >
                    <X className="size-4" />
                    Refuser
                  </button>
                  <button
                    onClick={() => decide(r, 'CONFIRMED')}
                    disabled={busy === r.id}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-rage-gradient px-4 text-xs font-bold text-black shadow-neon hover:brightness-110 sm:h-10 sm:flex-none"
                  >
                    <Check className="size-4" />
                    Accepter
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
