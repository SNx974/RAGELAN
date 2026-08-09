'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Headphones, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { assignOrganizer, removeOrganizer } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

export type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  role: 'ORGANIZER' | 'ADMIN' | 'SUPER_ADMIN';
  tournamentIds: string[];
};

export function StaffAssignments({
  staff,
  tournaments,
}: {
  staff: StaffMember[];
  tournaments: { id: string; name: string; accentFrom: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(member: StaffMember, tournamentId: string, assigned: boolean) {
    const key = `${member.id}-${tournamentId}`;
    setBusy(key);
    startTransition(async () => {
      const res = assigned
        ? await removeOrganizer(member.id, tournamentId)
        : await assignOrganizer(member.id, tournamentId);
      if ('error' in res && res.error) toast.error(String(res.error));
      else router.refresh();
      setBusy(null);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          Organisation
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Staff &amp; accès</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un organisateur n&apos;agit que sur les tournois qui lui sont assignés. Les admins
          passent partout.
        </p>
      </div>

      {staff.length === 0 ? (
        <div className="glass-card grid place-items-center px-6 py-20 text-center">
          <Headphones className="mb-3 size-9 text-white/15" />
          <p className="font-display text-lg font-bold text-white">Aucun membre du staff</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Promeus d&apos;abord un compte en Organisateur depuis la page Utilisateurs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((member) => {
            const isAdmin = member.role !== 'ORGANIZER';
            return (
              <div key={member.id} className="glass-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{member.fullName}</span>
                  <Badge variant={isAdmin ? 'red' : 'default'}>
                    <Shield className="size-3" />
                    {member.role === 'SUPER_ADMIN'
                      ? 'Super admin'
                      : member.role === 'ADMIN'
                        ? 'Admin'
                        : 'Organisateur'}
                  </Badge>
                  <span className="text-xs text-white/35">{member.email}</span>
                </div>

                {isAdmin ? (
                  <p className="mt-3 text-sm text-white/40">
                    Accès complet à tous les tournois — aucune assignation nécessaire.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tournaments.map((t) => {
                      const assigned = member.tournamentIds.includes(t.id);
                      const key = `${member.id}-${t.id}`;
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggle(member, t.id, assigned)}
                          disabled={busy === key}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                            assigned
                              ? 'border-transparent text-black'
                              : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white',
                            busy === key && 'opacity-50',
                          )}
                          style={assigned ? { background: t.accentFrom } : undefined}
                        >
                          {assigned && <Check className="size-3" />}
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
