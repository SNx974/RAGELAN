import { redirect } from 'next/navigation';
import { ScanLine } from 'lucide-react';
import { getCurrentUser, hasRole } from '@/lib/auth';
import { QrScanner } from '@/components/staff/qr-scanner';

export const dynamic = 'force-dynamic';

export default async function StaffScanPage() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, 'ORGANIZER')) redirect('/login?next=/staff/scan');

  const isAdmin = hasRole(user.role, 'ADMIN');
  const scopes = user.organizerScopes.map((s) => s.tournament.name);

  return (
    <div className="container max-w-xl py-8">
      <div className="mb-6">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
          <ScanLine className="size-3.5" />
          Jour J
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-bold text-white">Scan &amp; pointage</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isAdmin
            ? 'Accès à tous les tournois.'
            : scopes.length > 0
              ? `Tu peux pointer sur : ${scopes.join(', ')}.`
              : 'Aucun tournoi ne t’est assigné — demande à un administrateur.'}
        </p>
      </div>

      <QrScanner />
    </div>
  );
}
