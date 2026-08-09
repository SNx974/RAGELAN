'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTeamManually } from '@/app/actions/admin';

type Member = {
  firstName: string;
  lastName: string;
  pseudo: string;
  birthDate: string;
  isSubstitute: boolean;
};

const emptyMember = (): Member => ({
  firstName: '',
  lastName: '',
  pseudo: '',
  birthDate: '',
  isSubstitute: false,
});

/**
 * Saisie manuelle d'une équipe, réservée au super admin.
 * L'équipe est validée d'office : c'est l'organisation qui la saisit.
 */
export function ManualTeamForm({
  tournaments,
}: {
  tournaments: { id: string; name: string; teamSize: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const teamGames = tournaments.filter((t) => t.teamSize > 1);
  const [form, setForm] = useState({
    tournamentId: teamGames[0]?.id ?? '',
    teamName: '',
    teamTag: '',
    captainFirstName: '',
    captainLastName: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [members, setMembers] = useState<Member[]>([emptyMember()]);

  const selected = teamGames.find((t) => t.id === form.tournamentId);

  function submit() {
    startTransition(async () => {
      const res = await createTeamManually({ ...form, members });
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Équipe « ${form.teamName} » créée et validée.`);
      setOpen(false);
      setForm({ ...form, teamName: '', teamTag: '', captainFirstName: '', captainLastName: '', contactEmail: '', contactPhone: '' });
      setMembers([emptyMember()]);
      router.refresh();
    });
  }

  if (teamGames.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-lg border border-white/12 px-4 text-xs font-semibold text-white/70 transition-colors hover:border-rage-orange/50 hover:text-white"
      >
        <UserPlus className="size-4" />
        Inscrire une équipe
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 grid place-items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-2xl p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Inscrire une équipe
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Saisie par l&apos;organisation : l&apos;équipe est validée d&apos;office.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-white/40 hover:bg-white/5"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block">Tournoi</Label>
                    <select
                      value={form.tournamentId}
                      onChange={(e) => setForm({ ...form, tournamentId: e.target.value })}
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-rage-orange/60 focus:outline-none"
                    >
                      {teamGames.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.teamSize} joueurs)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-[1fr_90px] gap-3">
                    <div>
                      <Label className="mb-1.5 block">Nom d&apos;équipe</Label>
                      <Input
                        value={form.teamName}
                        onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Tag</Label>
                      <Input
                        maxLength={8}
                        value={form.teamTag}
                        onChange={(e) => setForm({ ...form, teamTag: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
                    Référent (contact)
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Prénom"
                      value={form.captainFirstName}
                      onChange={(e) => setForm({ ...form, captainFirstName: e.target.value })}
                    />
                    <Input
                      placeholder="Nom"
                      value={form.captainLastName}
                      onChange={(e) => setForm({ ...form, captainLastName: e.target.value })}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    />
                    <Input
                      type="tel"
                      placeholder="Téléphone"
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
                      Roster ({members.length}
                      {selected ? ` / ${selected.teamSize}` : ''})
                    </h4>
                    <button
                      onClick={() => setMembers([...members, emptyMember()])}
                      className="flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-1 text-xs text-white/70 hover:text-white"
                    >
                      <Plus className="size-3" />
                      Joueur
                    </button>
                  </div>

                  <div className="space-y-2">
                    {members.map((m, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_1fr_130px_auto] items-center gap-2"
                      >
                        <Input
                          placeholder="Prénom"
                          value={m.firstName}
                          onChange={(e) => {
                            const next = [...members];
                            next[i] = { ...m, firstName: e.target.value };
                            setMembers(next);
                          }}
                        />
                        <Input
                          placeholder="Nom"
                          value={m.lastName}
                          onChange={(e) => {
                            const next = [...members];
                            next[i] = { ...m, lastName: e.target.value };
                            setMembers(next);
                          }}
                        />
                        <Input
                          placeholder="Pseudo"
                          value={m.pseudo}
                          onChange={(e) => {
                            const next = [...members];
                            next[i] = { ...m, pseudo: e.target.value };
                            setMembers(next);
                          }}
                        />
                        <Input
                          type="date"
                          value={m.birthDate}
                          onChange={(e) => {
                            const next = [...members];
                            next[i] = { ...m, birthDate: e.target.value };
                            setMembers(next);
                          }}
                        />
                        <button
                          onClick={() => setMembers(members.filter((_, j) => j !== i))}
                          disabled={members.length === 1}
                          className="rounded-lg p-2 text-white/30 hover:text-rage-red disabled:opacity-25"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-white/30">
                    Le premier joueur est le capitaine. Aucune limite d&apos;âge n&apos;est
                    contrôlée sur une saisie manuelle.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="h-11 rounded-xl border border-white/12 px-5 text-sm font-semibold text-white/70 hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  onClick={submit}
                  disabled={pending}
                  className="h-11 rounded-xl bg-rage-gradient px-6 text-sm font-bold text-black shadow-neon hover:brightness-110 disabled:opacity-40"
                >
                  {pending ? 'Création…' : 'Créer et valider'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
