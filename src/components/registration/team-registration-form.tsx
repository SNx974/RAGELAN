'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, CreditCard, ImagePlus, Link2, Loader2, Shield, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitTeamRegistration } from '@/app/actions/registrations';
import { MAX_LOGO_BYTES, ageAtEvent, MIN_AGE } from '@/lib/validations';
import { formatPrice } from '@/lib/utils';
import { Notice, RecapCard, StepHeader, type FormProps } from './shared';

type Member = {
  firstName: string;
  lastName: string;
  pseudo: string;
  birthDate: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
};

const emptyMember = (): Member => ({
  firstName: '',
  lastName: '',
  pseudo: '',
  birthDate: '',
  email: '',
  guardianName: '',
  guardianPhone: '',
});

export function TeamRegistrationForm(props: FormProps) {
  const { tournament, user } = props;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();

  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [ign, setIgn] = useState(user.pseudo ?? '');
  const [contactEmail, setContactEmail] = useState(user.email);
  const [contactPhone, setContactPhone] = useState(user.phone);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Le capitaine occupe la première place : il reste teamSize - 1 joueurs.
  const [members, setMembers] = useState<Member[]>(() =>
    Array.from({ length: Math.max(0, tournament.teamSize - 1) }, emptyMember),
  );

  function pickLogo(file: File | null) {
    if (!file) {
      setLogo(null);
      setLogoPreview(null);
      return;
    }
    if (file.type !== 'image/png') {
      toast.error('Le logo doit être au format PNG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(`Logo trop lourd : ${(file.size / 1048576).toFixed(1)} Mo pour 5 Mo maximum.`);
      return;
    }
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  const memberProblems = members.map((m) => {
    if (!m.firstName.trim() || !m.lastName.trim() || !m.pseudo.trim()) return 'Champs manquants';
    if (!m.birthDate) return 'Date de naissance manquante';
    const age = ageAtEvent(new Date(m.birthDate));
    if (age < MIN_AGE) return `${age} ans le jour J — ${MIN_AGE} ans minimum`;
    if (age < 18 && (!m.guardianName.trim() || !m.guardianPhone.trim()))
      return 'Mineur : responsable légal obligatoire';
    return null;
  });

  const formReady =
    teamName.trim().length >= 2 &&
    contactEmail.includes('@') &&
    contactPhone.trim().length >= 8 &&
    memberProblems.every((p) => p === null);

  function submit() {
    startTransition(async () => {
      const payload = {
        tournamentSlug: tournament.slug,
        teamName: teamName.trim(),
        teamTag: teamTag.trim(),
        ign: ign.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        paymentChoice: 'ONLINE' as const,
        members: members.map((m) => ({
          firstName: m.firstName.trim(),
          lastName: m.lastName.trim(),
          pseudo: m.pseudo.trim(),
          birthDate: m.birthDate,
          email: m.email.trim(),
          guardianName: m.guardianName.trim(),
          guardianPhone: m.guardianPhone.trim(),
          isSubstitute: false,
        })),
      };

      const fd = new FormData();
      fd.append('payload', JSON.stringify(payload));
      if (logo) fd.append('logo', logo);

      const res = await submitTeamRegistration(fd);
      if ('error' in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Équipe enregistrée. Passe au paiement depuis ton espace.');
      router.push('/dashboard?equipe=1');
    });
  }

  return (
    <AnimatePresence mode="wait">
      {step === 1 ? (
        <motion.div key="form" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          <StepHeader
            step={1}
            total={2}
            title={`Inscrire une équipe — ${tournament.name}`}
            subtitle={`${tournament.teamSize} joueurs, toi compris. ${formatPrice(tournament.shareCents)} par joueur.`}
          />

          <div className="space-y-4">
            {/* ── Identité de l'équipe ─────────────────────────── */}
            <section className="glass-card p-5">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
                L&apos;équipe
              </h2>
              <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
                <div>
                  <Label className="mb-1.5 block">Nom d&apos;équipe</Label>
                  <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={60} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Tag</Label>
                  <Input value={teamTag} onChange={(e) => setTeamTag(e.target.value)} maxLength={8} placeholder="RAGE" />
                </div>
              </div>

              <div className="mt-4">
                <Label className="mb-1.5 block">Logo — PNG, 5 Mo maximum</Label>
                <div className="flex items-center gap-4">
                  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob)
                      <img src={logoPreview} alt="" className="size-full object-contain p-1.5" />
                    ) : (
                      <Shield className="size-6 text-white/20" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-10 items-center gap-2 rounded-lg border border-white/12 px-4 text-xs font-semibold text-white/70 hover:border-rage-orange/50 hover:text-white"
                    >
                      <ImagePlus className="size-4" />
                      {logo ? 'Changer' : 'Choisir un fichier'}
                    </button>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => pickLogo(null)}
                        className="flex h-10 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs text-white/50 hover:text-rage-red"
                      >
                        <X className="size-4" />
                        Retirer
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png"
                    hidden
                    onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            </section>

            {/* ── Contact référent ─────────────────────────────── */}
            <section className="glass-card p-5">
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
                Contact du référent
              </h2>
              <p className="mb-4 text-xs text-white/35">
                C’est à cette adresse que partiront la confirmation et les liens de paiement.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Email</Label>
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Téléphone</Label>
                  <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Ton pseudo en jeu</Label>
                  <Input value={ign} onChange={(e) => setIgn(e.target.value)} maxLength={60} />
                </div>
              </div>
            </section>

            {/* ── Roster ───────────────────────────────────────── */}
            <section className="glass-card p-5">
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
                Coéquipiers ({members.length})
              </h2>
              <p className="mb-4 text-xs text-white/35">
                Tu es automatiquement capitaine. {MIN_AGE} ans minimum le jour de l’événement.
              </p>

              <div className="space-y-3">
                {members.map((m, i) => {
                  const age = m.birthDate ? ageAtEvent(new Date(m.birthDate)) : null;
                  const minor = age !== null && age < 18 && age >= MIN_AGE;
                  const problem = memberProblems[i];
                  return (
                    <div key={i} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                          Joueur {i + 2}
                        </span>
                        {age !== null && (
                          <span className={age < MIN_AGE ? 'text-[11px] font-semibold text-rage-red' : 'text-[11px] text-white/35'}>
                            {age} ans le jour J
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <Input placeholder="Prénom" value={m.firstName} onChange={(e) => update(i, { firstName: e.target.value })} />
                        <Input placeholder="Nom" value={m.lastName} onChange={(e) => update(i, { lastName: e.target.value })} />
                        <Input placeholder="Pseudo" value={m.pseudo} onChange={(e) => update(i, { pseudo: e.target.value })} />
                        <Input type="date" value={m.birthDate} onChange={(e) => update(i, { birthDate: e.target.value })} />
                        <Input
                          className="col-span-2 lg:col-span-4"
                          type="email"
                          placeholder="Email (pour lui envoyer son lien de paiement)"
                          value={m.email}
                          onChange={(e) => update(i, { email: e.target.value })}
                        />
                      </div>

                      {minor && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Input placeholder="Responsable légal" value={m.guardianName} onChange={(e) => update(i, { guardianName: e.target.value })} />
                          <Input placeholder="Tél. du responsable" value={m.guardianPhone} onChange={(e) => update(i, { guardianPhone: e.target.value })} />
                        </div>
                      )}

                      {problem && (
                        <p className="mt-2 text-[11px] font-medium text-rage-red">{problem}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <Notice>
              Le remplaçant ne s’inscrit pas en ligne : présente-le à un administrateur sur
              place le jour J, le règlement se fera physiquement.
            </Notice>

            <button
              onClick={() => setStep(2)}
              disabled={!formReady}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
            >
              Voir le récapitulatif
              <ArrowRight className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div key="recap" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
          <StepHeader step={2} total={2} title="Récapitulatif" subtitle="Vérifie avant de valider." />

          <RecapCard
            {...props}
            extra={[
              { label: 'Équipe', value: teamTag ? `[${teamTag}] ${teamName}` : teamName },
              { label: 'Logo', value: logo ? logo.name : 'Aucun' },
              { label: 'Roster', value: `${members.length + 1} joueurs` },
            ]}
          />

          <div className="mt-4 glass-card p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-rage-orange">
              Ensuite
            </h2>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex gap-2.5">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-white/30" />
                Régler les {formatPrice(tournament.totalDueCents)} d’un coup depuis ton espace
              </li>
              <li className="flex gap-2.5">
                <Link2 className="mt-0.5 size-4 shrink-0 text-white/30" />
                Ou envoyer un lien de {formatPrice(tournament.shareCents)} à chaque joueur
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={() => setStep(1)}
              disabled={pending}
              className="h-12 rounded-xl border border-white/12 px-5 text-sm font-semibold text-white/70 hover:bg-white/5"
            >
              Modifier
            </button>
            <button
              onClick={submit}
              disabled={pending}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? 'Enregistrement…' : 'Valider mon équipe'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  function update(index: number, patch: Partial<Member>) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }
}
