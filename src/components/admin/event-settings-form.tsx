'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Lock, Unlock, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateEventSettings } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

type Settings = {
  eventName: string;
  venueName: string;
  venueAddress: string;
  registrationsOpen: boolean;
};

export function EventSettingsForm({
  settings,
  counts,
}: {
  settings: Settings;
  counts: { tournaments: number; users: number; teams: number; registrations: number };
}) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  function save() {
    startTransition(async () => {
      const res = await updateEventSettings(form);
      if ('error' in res) toast.error(res.error);
      else {
        toast.success('Paramètres enregistrés.');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          Configuration
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Paramètres</h1>
      </div>

      <div className="glass-card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block">Nom de l&apos;événement</Label>
            <Input
              value={form.eventName}
              onChange={(e) => setForm({ ...form, eventName: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Lieu</Label>
            <Input
              value={form.venueName}
              placeholder="Gymnase Daniel Narcisse"
              onChange={(e) => setForm({ ...form, venueName: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Adresse</Label>
            <Input
              value={form.venueAddress}
              placeholder="97419 La Possession"
              onChange={(e) => setForm({ ...form, venueAddress: e.target.value })}
            />
          </div>
        </div>

        {/* Interrupteur global : prime sur l'ouverture de chaque tournoi. */}
        <button
          type="button"
          onClick={() => setForm({ ...form, registrationsOpen: !form.registrationsOpen })}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
            form.registrationsOpen
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rage-red/30 bg-rage-red/10 text-rage-red',
          )}
        >
          {form.registrationsOpen ? <Unlock className="size-4" /> : <Lock className="size-4" />}
          Inscriptions {form.registrationsOpen ? 'ouvertes' : 'fermées'} pour toute la LAN
          <span className="ml-auto text-xs font-normal opacity-70">
            {form.registrationsOpen ? 'Cliquer pour fermer' : 'Cliquer pour ouvrir'}
          </span>
        </button>

        <div className="flex justify-end border-t border-white/[0.06] pt-4">
          <button
            onClick={save}
            disabled={pending || !dirty}
            className="flex h-11 items-center gap-2 rounded-xl bg-rage-gradient px-6 text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
          >
            <Save className="size-4" />
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
          <Database className="size-3.5" />
          Contenu de la base
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Tournois', counts.tournaments],
            ['Comptes', counts.users],
            ['Équipes', counts.teams],
            ['Inscriptions', counts.registrations],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-black/25 p-4 text-center">
              <p className="font-display text-2xl font-bold text-white">{value}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/35">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
