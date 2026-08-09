'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertCircle, LogIn } from 'lucide-react';
import { loginAction, type ActionState } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <LogIn />
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(loginAction, null);

  return (
    <motion.form
      action={formAction}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card space-y-5 p-7"
    >
      {state?.error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 rounded-lg border border-rage-red/30 bg-rage-red/10 px-3 py-2.5 text-sm text-rage-red"
        >
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-rage-red">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state?.fieldErrors?.password && (
          <p className="text-xs text-rage-red">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <SubmitButton />
    </motion.form>
  );
}
