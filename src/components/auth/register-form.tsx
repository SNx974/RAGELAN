'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, UserPlus, ShieldAlert } from 'lucide-react';
import { registerAction, type ActionState } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ageFrom } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <UserPlus />
      {pending ? 'Création…' : 'Créer mon compte'}
    </Button>
  );
}

function Field({
  name,
  label,
  errors,
  children,
  className,
}: {
  name: string;
  label: string;
  errors?: Record<string, string[]>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="mb-2 block">
        {label}
      </Label>
      {children}
      {errors?.[name] && <p className="mt-1 text-xs text-rage-red">{errors[name][0]}</p>}
    </div>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(registerAction, null);
  const [birthDate, setBirthDate] = useState('');

  const isMinor = birthDate ? ageFrom(birthDate) < 18 : false;
  const errors = state?.fieldErrors;

  return (
    <motion.form
      action={formAction}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card space-y-7 p-7 sm:p-9"
    >
      {/* Destination voulue avant la redirection vers l'inscription. */}
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <div className="flex items-center gap-2 rounded-lg border border-rage-red/30 bg-rage-red/10 px-3 py-2.5 text-sm text-rage-red">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-rage-orange">
          Identité
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="firstName" label="Prénom" errors={errors}>
            <Input id="firstName" name="firstName" required autoComplete="given-name" />
          </Field>
          <Field name="lastName" label="Nom" errors={errors}>
            <Input id="lastName" name="lastName" required autoComplete="family-name" />
          </Field>
          <Field name="pseudo" label="Pseudo (optionnel)" errors={errors}>
            <Input id="pseudo" name="pseudo" placeholder="TonPseudo" />
          </Field>
          <Field name="birthDate" label="Date de naissance" errors={errors}>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <AnimatePresence>
        {isMinor && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-xl border border-rage-yellow/30 bg-rage-yellow/[0.06] p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-rage-yellow">
                <ShieldAlert className="size-4" />
                Participant mineur — responsable légal obligatoire
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="guardianName" label="Nom du responsable" errors={errors}>
                  <Input id="guardianName" name="guardianName" required={isMinor} />
                </Field>
                <Field name="guardianPhone" label="Téléphone du responsable" errors={errors}>
                  <Input id="guardianPhone" name="guardianPhone" type="tel" required={isMinor} />
                </Field>
              </div>
              <p className="text-xs text-white/45">
                Une autorisation parentale signée sera demandée à l&apos;entrée.
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-rage-orange">
          Contact
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="email" label="Email" errors={errors}>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field name="phone" label="Téléphone" errors={errors}>
            <Input id="phone" name="phone" type="tel" required autoComplete="tel" />
          </Field>
          <Field name="addressLine" label="Adresse" errors={errors} className="sm:col-span-2">
            <Input id="addressLine" name="addressLine" required autoComplete="street-address" />
          </Field>
          <Field name="postalCode" label="Code postal" errors={errors}>
            <Input id="postalCode" name="postalCode" required autoComplete="postal-code" />
          </Field>
          <Field name="city" label="Ville" errors={errors}>
            <Input id="city" name="city" required autoComplete="address-level2" />
          </Field>
          <Field name="country" label="Pays" errors={errors} className="sm:col-span-2">
            <Input id="country" name="country" defaultValue="France" autoComplete="country-name" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-rage-orange">
          Sécurité
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="password" label="Mot de passe" errors={errors}>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
          </Field>
          <Field name="confirmPassword" label="Confirmation" errors={errors}>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
          </Field>
        </div>
        <p className="text-xs text-white/40">
          10 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre.
        </p>
      </section>

      <label className="flex items-start gap-3 text-sm text-white/60">
        <input
          type="checkbox"
          name="acceptRules"
          required
          className="mt-0.5 size-4 rounded border-white/20 bg-transparent accent-rage-orange"
        />
        <span>
          J&apos;accepte le règlement intérieur de la R.A.G.E LAN 2 et le traitement de mes
          données pour l&apos;organisation de l&apos;événement.
        </span>
      </label>
      {errors?.acceptRules && <p className="text-xs text-rage-red">{errors.acceptRules[0]}</p>}

      <SubmitButton />
    </motion.form>
  );
}
