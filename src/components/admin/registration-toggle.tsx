'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Lock, Unlock } from 'lucide-react';
import { toggleGlobalRegistrations } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

export function RegistrationToggle({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next); // optimiste
    startTransition(async () => {
      const result = await toggleGlobalRegistrations(next);
      if ('error' in result) {
        setOpen(!next);
        toast.error('Échec de la mise à jour.');
      } else {
        toast.success(next ? 'Inscriptions ouvertes.' : 'Inscriptions fermées.');
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all',
        open
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-rage-red/30 bg-rage-red/10 text-rage-red',
        pending && 'opacity-60',
      )}
    >
      {open ? <Unlock className="size-4" /> : <Lock className="size-4" />}
      Inscriptions {open ? 'ouvertes' : 'fermées'}
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          open ? 'bg-emerald-500/40' : 'bg-white/15',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-white',
            open ? 'right-0.5' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}
