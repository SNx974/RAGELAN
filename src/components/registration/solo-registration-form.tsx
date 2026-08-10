'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, CreditCard, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerAsSolo } from '@/app/actions/registrations';
import { formatPrice } from '@/lib/utils';
import { RecapCard, StepHeader, type FormProps } from './shared';

/**
 * Parcours solo : saisie → récapitulatif → paiement intégral.
 * Aucune place n'est tenue tant que le règlement n'est pas reçu.
 */
export function SoloRegistrationForm(props: FormProps) {
  const { tournament } = props;
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [ign, setIgn] = useState(props.user.pseudo ?? '');
  const [lookingForTeam, setLookingForTeam] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitAndPay() {
    startTransition(async () => {
      const res = await registerAsSolo({
        tournamentSlug: tournament.slug,
        ign,
        paymentChoice: 'ONLINE',
        lookingForTeam,
      });

      if ('error' in res && res.error) {
        toast.error(res.error);
        return;
      }

      // L'inscription existe ; on enchaîne sur Stripe.
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: res.registrationId }),
      });
      const data = await response.json();

      if (!response.ok) {
        // L'inscription est enregistrée : on n'annule rien, le joueur
        // pourra payer depuis son espace quand Stripe sera actif.
        toast.error(data.error ?? 'Paiement indisponible.');
        router.push('/dashboard?inscrit=1');
        return;
      }
      window.location.href = data.url;
    });
  }

  return (
    <AnimatePresence mode="wait">
      {step === 1 ? (
        <motion.div key="form" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
          <StepHeader
            step={1}
            total={2}
            title={`Inscription — ${tournament.name}`}
            subtitle="Quelques informations et tu passes au récapitulatif."
          />

          <div className="glass-card space-y-5 p-6">
            <div>
              <Label htmlFor="ign" className="mb-1.5 block">
                Pseudo en jeu
              </Label>
              <Input
                id="ign"
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
                placeholder="Riot ID, code ami, gamertag…"
                maxLength={60}
              />
              <p className="mt-1.5 text-xs text-white/35">
                C’est ce nom qui apparaîtra sur l’arbre du tournoi.
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={lookingForTeam}
                onChange={(e) => setLookingForTeam(e.target.checked)}
                className="mt-0.5 size-4 rounded border-white/20 bg-transparent accent-rage-orange"
              />
              Je cherche une équipe — l’organisation peut me proposer un groupe.
            </label>

            <button
              onClick={() => setStep(2)}
              disabled={ign.trim().length < 2}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
            >
              Voir le récapitulatif
              <ArrowRight className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div key="recap" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
          <StepHeader
            step={2}
            total={2}
            title="Récapitulatif"
            subtitle="Vérifie tout avant de régler."
          />

          <RecapCard {...props} extra={[{ label: 'Pseudo en jeu', value: ign }]} />

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={() => setStep(1)}
              disabled={pending}
              className="h-12 rounded-xl border border-white/12 px-5 text-sm font-semibold text-white/70 hover:bg-white/5"
            >
              Modifier
            </button>
            <button
              onClick={submitAndPay}
              disabled={pending}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              {pending
                ? 'Un instant…'
                : `Payer ${formatPrice(tournament.totalDueCents)} et réserver`}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
