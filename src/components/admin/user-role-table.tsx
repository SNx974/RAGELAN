'use client';

import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Shield, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { setUserRole } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

export type ManagedUser = {
  id: string;
  fullName: string;
  pseudo: string | null;
  email: string;
  phone: string;
  role: 'PLAYER' | 'ORGANIZER' | 'ADMIN' | 'SUPER_ADMIN';
  registrations: number;
  createdAt: string;
  isSelf: boolean;
};

const ROLES = ['PLAYER', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'] as const;

const ROLE_LABEL: Record<ManagedUser['role'], string> = {
  PLAYER: 'Joueur',
  ORGANIZER: 'Organisateur',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super admin',
};

export function UserRoleTable({
  users,
  canPromote,
}: {
  users: ManagedUser[];
  canPromote: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.fullName} ${u.pseudo ?? ''} ${u.email}`.toLowerCase().includes(q),
    );
  }, [users, deferred]);

  function changeRole(user: ManagedUser, role: ManagedUser['role']) {
    setBusy(user.id);
    startTransition(async () => {
      const res = await setUserRole({ userId: user.id, role });
      if ('error' in res && res.error) toast.error(res.error);
      else {
        toast.success(`${user.fullName} → ${ROLE_LABEL[role]}`);
        router.refresh();
      }
      setBusy(null);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          Accès
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} comptes ·{' '}
          {users.filter((u) => u.role !== 'PLAYER').length} membres du staff
        </p>
      </div>

      {!canPromote && (
        <p className="flex items-center gap-2 rounded-xl border border-rage-yellow/25 bg-rage-yellow/[0.07] px-4 py-3 text-sm text-rage-yellow">
          <Lock className="size-4 shrink-0" />
          Seul un super admin peut modifier les rôles.
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, pseudo ou email…"
          className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:border-rage-orange/60 focus:outline-none"
        />
      </div>

      <div className="glass-card divide-y divide-white/[0.05] overflow-hidden">
        {filtered.slice(0, 150).map((u) => (
          <div
            key={u.id}
            className={cn(
              'flex flex-wrap items-center gap-4 px-5 py-3.5',
              busy === u.id && 'opacity-60',
            )}
          >
            <div className="min-w-[180px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{u.fullName}</span>
                {u.pseudo && <span className="text-xs text-white/35">{u.pseudo}</span>}
                {u.isSelf && <Badge variant="neutral">toi</Badge>}
                {u.role !== 'PLAYER' && (
                  <Badge variant={u.role === 'SUPER_ADMIN' ? 'red' : 'default'}>
                    <Shield className="size-3" />
                    {ROLE_LABEL[u.role]}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-white/40">
                {u.email} · {u.phone} · {u.registrations} inscription
                {u.registrations > 1 ? 's' : ''}
              </p>
            </div>

            <select
              value={u.role}
              // On ne peut pas modifier son propre rôle : cela permettrait
              // au dernier super admin de se verrouiller dehors.
              disabled={!canPromote || u.isSelf || busy === u.id}
              onChange={(e) => changeRole(u, e.target.value as ManagedUser['role'])}
              className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-rage-orange/60 focus:outline-none disabled:opacity-40"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-14 text-center text-sm text-white/30">Aucun compte trouvé.</p>
        )}
      </div>

      {filtered.length > 150 && (
        <p className="text-center text-xs text-white/30">
          {filtered.length - 150} comptes supplémentaires — affine la recherche.
        </p>
      )}
    </div>
  );
}
