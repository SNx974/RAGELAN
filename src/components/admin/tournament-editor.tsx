'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronDown, Save, Armchair, Table2, Users, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { updateTournament } from '@/app/actions/admin';
import { cn, formatPrice } from '@/lib/utils';

export type EditableTournament = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  formatLabel: string;
  entryFeeCents: number;
  maxPlayers: number;
  maxTeams: number;
  teamSize: number;
  tableCount: number;
  chairCount: number;
  seatFormat: 'FIXED' | 'ROTATION';
  registrationOpen: boolean;
  accentFrom: string;
  registered: number;
  teamCount: number;
  seatCount: number;
};

export function TournamentEditor({ tournaments }: { tournaments: EditableTournament[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          Configuration
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Tournois</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prix, effectifs, tables et chaises. Modifier le matériel régénère le plan de salle.
        </p>
      </div>

      <div className="space-y-3">
        {tournaments.map((t) => (
          <div key={t.id} className="glass-card overflow-hidden">
            <button
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.accentFrom }} />
              <div className="min-w-[140px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{t.name}</span>
                  <Badge variant={t.registrationOpen ? 'success' : 'neutral'}>
                    {t.registrationOpen ? 'Ouvert' : 'Fermé'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-white/40">
                  {t.registered}/{t.maxPlayers} joueurs · {t.tableCount} tables ·{' '}
                  {t.chairCount} chaises · {formatPrice(t.entryFeeCents)}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-white/40 transition-transform',
                  openId === t.id && 'rotate-180',
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {openId === t.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-t border-white/[0.07]"
                >
                  <TournamentForm tournament={t} onDone={() => setOpenId(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function TournamentForm({
  tournament: t,
  onDone,
}: {
  tournament: EditableTournament;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: t.name,
    tagline: t.tagline,
    formatLabel: t.formatLabel,
    entryFeeEuros: (t.entryFeeCents / 100).toFixed(2),
    maxPlayers: String(t.maxPlayers),
    maxTeams: String(t.maxTeams),
    teamSize: String(t.teamSize),
    tableCount: String(t.tableCount),
    chairCount: String(t.chairCount),
    seatFormat: t.seatFormat,
    registrationOpen: t.registrationOpen,
  });

  const set = (k: keyof typeof form) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const planChanged =
    Number(form.tableCount) !== t.tableCount ||
    Number(form.chairCount) !== t.chairCount ||
    form.seatFormat !== t.seatFormat;

  // Miroir du contrôle serveur, pour prévenir avant l'envoi.
  const notEnoughChairs =
    form.seatFormat === 'FIXED' && Number(form.chairCount) < Number(form.maxPlayers);

  function submit() {
    startTransition(async () => {
      const res = await updateTournament(t.id, {
        name: form.name,
        tagline: form.tagline,
        formatLabel: form.formatLabel,
        entryFeeCents: Math.round(Number(form.entryFeeEuros) * 100),
        maxPlayers: Number(form.maxPlayers),
        maxTeams: Number(form.maxTeams),
        teamSize: Number(form.teamSize),
        tableCount: Number(form.tableCount),
        chairCount: Number(form.chairCount),
        seatFormat: form.seatFormat,
        registrationOpen: form.registrationOpen,
      });

      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.planChanged
          ? `${t.name} enregistré · plan régénéré (${res.seatsRebuilt} sièges${
              res.placementsLost > 0 ? `, ${res.placementsLost} placements libérés` : ''
            })`
          : `${t.name} enregistré.`,
      );
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <Input value={form.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <Field label="Format affiché">
          <Input value={form.formatLabel} onChange={(e) => set('formatLabel')(e.target.value)} />
        </Field>
        <Field label="Accroche" className="sm:col-span-2">
          <Input value={form.tagline} onChange={(e) => set('tagline')(e.target.value)} />
        </Field>
      </div>

      <Section title="Tarif et effectifs">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Prix (€)">
            <Input
              type="number"
              step="0.50"
              min="0"
              value={form.entryFeeEuros}
              onChange={(e) => set('entryFeeEuros')(e.target.value)}
            />
          </Field>
          <Field label="Joueurs max" hint={`${t.registered} inscrits`}>
            <Input
              type="number"
              min="2"
              value={form.maxPlayers}
              onChange={(e) => set('maxPlayers')(e.target.value)}
            />
          </Field>
          <Field label="Équipes max" hint={t.teamSize > 1 ? `${t.teamCount} créées` : 'Solo : 0'}>
            <Input
              type="number"
              min="0"
              value={form.maxTeams}
              onChange={(e) => set('maxTeams')(e.target.value)}
            />
          </Field>
          <Field label="Joueurs / équipe" hint="1 = solo">
            <Input
              type="number"
              min="1"
              value={form.teamSize}
              onChange={(e) => set('teamSize')(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Plan de salle">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tables" hint={`${t.seatCount} sièges actuels`}>
            <Input
              type="number"
              min="1"
              value={form.tableCount}
              onChange={(e) => set('tableCount')(e.target.value)}
            />
          </Field>
          <Field label="Chaises">
            <Input
              type="number"
              min="1"
              value={form.chairCount}
              onChange={(e) => set('chairCount')(e.target.value)}
            />
          </Field>
          <Field label="Attribution">
            <select
              value={form.seatFormat}
              onChange={(e) => set('seatFormat')(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white focus:border-rage-orange/60 focus:outline-none"
            >
              <option value="FIXED">Places fixes</option>
              <option value="ROTATION">Rotation</option>
            </select>
          </Field>
        </div>

        {notEnoughChairs && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-rage-red/25 bg-rage-red/[0.07] px-3 py-2 text-xs text-rage-red">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            En places fixes, il faut au moins autant de chaises que de joueurs
            ({form.maxPlayers} demandés, {form.chairCount} saisies).
          </p>
        )}

        {planChanged && !notEnoughChairs && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-rage-yellow/25 bg-rage-yellow/[0.07] px-3 py-2 text-xs text-rage-yellow">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Le plan de salle sera régénéré. Les joueurs déjà placés sur ce tournoi seront
            remis dans la liste « à placer ».
          </p>
        )}
      </Section>

      <label className="flex items-center gap-3 text-sm text-white/70">
        <input
          type="checkbox"
          checked={form.registrationOpen}
          onChange={(e) => set('registrationOpen')(e.target.checked)}
          className="size-4 rounded border-white/20 bg-transparent accent-rage-orange"
        />
        Inscriptions ouvertes sur ce tournoi
      </label>

      <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
        <button
          onClick={onDone}
          className="h-11 rounded-xl border border-white/12 px-5 text-sm font-semibold text-white/70 hover:bg-white/5"
        >
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={pending || notEnoughChairs}
          className="flex h-11 items-center gap-2 rounded-xl bg-rage-gradient px-6 text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
        >
          <Save className="size-4" />
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {hint && <span className="text-[10px] normal-case tracking-normal text-white/30">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
