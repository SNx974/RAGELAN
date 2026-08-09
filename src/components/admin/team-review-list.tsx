'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Check, X, Shield, Crown, Mail, Phone, ShieldAlert, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { reviewTeam } from '@/app/actions/admin';
import { ManualTeamForm } from './manual-team-form';
import { cn, formatPrice } from '@/lib/utils';

export type ReviewableTeam = {
  id: string;
  name: string;
  tag: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hasLogo: boolean;
  rejectionReason: string | null;
  tournamentName: string;
  accent: string;
  entryFeeCents: number;
  contactEmail: string;
  contactPhone: string;
  captainName: string;
  createdAt: string;
  players: {
    pseudo: string;
    fullName: string;
    birthDate: string;
    hasGuardian: boolean;
    isCaptain: boolean;
    isSubstitute: boolean;
  }[];
};

const EVENT_DATE = new Date('2026-10-23');

function ageAtEvent(iso: string) {
  const d = new Date(iso);
  let age = EVENT_DATE.getFullYear() - d.getFullYear();
  const m = EVENT_DATE.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && EVENT_DATE.getDate() < d.getDate())) age--;
  return age;
}

export function TeamReviewList({
  teams,
  tournaments,
  canCreateManually,
}: {
  teams: ReviewableTeam[];
  tournaments: { id: string; name: string; teamSize: number }[];
  canCreateManually: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [rejecting, setRejecting] = useState<ReviewableTeam | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const shown = useMemo(
    () => (filter === 'PENDING' ? teams.filter((t) => t.status === 'PENDING') : teams),
    [teams, filter],
  );
  const pendingCount = teams.filter((t) => t.status === 'PENDING').length;

  function decide(team: ReviewableTeam, decision: 'APPROVED' | 'REJECTED', reason?: string) {
    setBusy(team.id);
    startTransition(async () => {
      const res = await reviewTeam(team.id, decision, reason);
      if ('error' in res && res.error) toast.error(res.error);
      else {
        toast.success(
          decision === 'APPROVED'
            ? `${team.name} validée — e-mail envoyé au référent.`
            : `${team.name} refusée — motif transmis.`,
        );
        setRejecting(null);
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
            Validation
          </p>
          <h1 className="font-display text-3xl font-bold text-white">Équipes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingCount} en attente · {teams.length} au total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canCreateManually && <ManualTeamForm tournaments={tournaments} />}
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
          <p className="mt-1 text-sm text-muted-foreground">
            Toutes les équipes inscrites ont été examinées.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((team) => (
            <motion.div
              key={team.id}
              layout
              className={cn('glass-card p-5', busy === team.id && 'opacity-60')}
            >
              <div className="flex flex-wrap items-start gap-4">
                <div
                  className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40"
                  style={{ boxShadow: `inset 0 0 20px ${team.accent}22` }}
                >
                  {team.hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- route dynamique
                    <img
                      src={`/api/teams/${team.id}/logo`}
                      alt=""
                      className="size-full object-contain p-1"
                    />
                  ) : (
                    <Shield className="size-5 text-white/20" />
                  )}
                </div>

                <div className="min-w-[200px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-white">
                      {team.tag && <span className="text-white/35">[{team.tag}] </span>}
                      {team.name}
                    </h2>
                    <Badge
                      variant={
                        team.status === 'APPROVED'
                          ? 'success'
                          : team.status === 'REJECTED'
                            ? 'red'
                            : 'yellow'
                      }
                    >
                      {team.status === 'APPROVED'
                        ? 'Validée'
                        : team.status === 'REJECTED'
                          ? 'Refusée'
                          : 'En attente'}
                    </Badge>
                    {/* Le logo n'est pas obligatoire, mais son absence se voit. */}
                    {!team.hasLogo && <Badge variant="neutral">Sans logo</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    {team.tournamentName} · référent {team.captainName} ·{' '}
                    {formatPrice(team.entryFeeCents)} à régler
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                    <a
                      href={`mailto:${team.contactEmail}`}
                      className="flex items-center gap-1.5 hover:text-rage-orange"
                    >
                      <Mail className="size-3" />
                      {team.contactEmail}
                    </a>
                    <a
                      href={`tel:${team.contactPhone}`}
                      className="flex items-center gap-1.5 hover:text-rage-orange"
                    >
                      <Phone className="size-3" />
                      {team.contactPhone}
                    </a>
                  </div>
                </div>

                {team.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRejecting(team)}
                      disabled={busy === team.id}
                      className="flex h-10 items-center gap-1.5 rounded-lg border border-rage-red/40 px-3 text-xs font-semibold text-rage-red transition-colors hover:bg-rage-red/10"
                    >
                      <X className="size-4" />
                      Refuser
                    </button>
                    <button
                      onClick={() => decide(team, 'APPROVED')}
                      disabled={busy === team.id}
                      className="flex h-10 items-center gap-1.5 rounded-lg bg-rage-gradient px-4 text-xs font-bold text-black shadow-neon transition-all hover:brightness-110"
                    >
                      <Check className="size-4" />
                      Valider
                    </button>
                  </div>
                )}
              </div>

              {team.rejectionReason && (
                <p className="mt-3 rounded-lg border border-rage-red/25 bg-rage-red/[0.07] px-3 py-2 text-xs text-rage-red">
                  Motif transmis : {team.rejectionReason}
                </p>
              )}

              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                  <Users className="size-3" />
                  Roster ({team.players.length})
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {team.players.map((p, i) => {
                    const age = ageAtEvent(p.birthDate);
                    const minor = age < 18;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg bg-black/25 px-2.5 py-1.5 text-xs"
                      >
                        {p.isCaptain ? (
                          <Crown className="size-3 shrink-0 text-rage-yellow" />
                        ) : (
                          <span className="size-1.5 shrink-0 rounded-full bg-white/20" />
                        )}
                        <span className="truncate font-semibold text-white">{p.pseudo}</span>
                        <span className="truncate text-white/35">{p.fullName}</span>
                        <span
                          className={cn(
                            'ml-auto shrink-0 font-semibold',
                            age < 16 ? 'text-rage-red' : minor ? 'text-rage-yellow' : 'text-white/35',
                          )}
                        >
                          {age} ans
                        </span>
                        {/* Un mineur sans responsable déclaré doit sauter aux yeux. */}
                        {minor && !p.hasGuardian && (
                          <ShieldAlert className="size-3 shrink-0 text-rage-red" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {rejecting && (
          <RejectDialog
            team={rejecting}
            onClose={() => setRejecting(null)}
            onConfirm={(reason) => decide(rejecting, 'REJECTED', reason)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RejectDialog({
  team,
  onClose,
  onConfirm,
}: {
  team: ReviewableTeam;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

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
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-md p-6"
      >
        <h3 className="font-display text-xl font-bold text-white">Refuser {team.name}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Le motif est envoyé par e-mail à {team.contactEmail}.
        </p>
        <textarea
          autoFocus
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Roster incomplet, joueur de moins de 16 ans, doublon…"
          className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-white/30 focus:border-rage-orange/60 focus:outline-none"
        />
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-white/12 text-sm font-semibold text-white/70 hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason)}
            className="h-11 flex-1 rounded-xl bg-rage-red text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
          >
            Confirmer le refus
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
