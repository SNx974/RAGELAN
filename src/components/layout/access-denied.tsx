import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

const ROLE_LABEL: Record<string, string> = {
  PLAYER: 'Joueur',
  ORGANIZER: 'Organisateur',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super administrateur',
};

/**
 * Refus d'accès pour quelqu'un **déjà connecté**.
 *
 * Le renvoyer vers la page de connexion serait une impasse : il s'y
 * verrait proposer de s'identifier alors qu'il l'est déjà. On lui dit
 * plutôt ce qui manque, et on lui offre de changer de compte.
 */
export function AccessDenied({
  currentRole,
  requiredRole,
  area,
}: {
  currentRole: string;
  requiredRole: string;
  area: string;
}) {
  return (
    <div className="container max-w-lg py-20">
      <div className="glass-card px-6 py-12 text-center">
        <ShieldAlert className="mx-auto mb-4 size-10 text-rage-yellow" />
        <h1 className="font-display text-2xl font-bold text-white">Accès refusé</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {area} demande le rôle{' '}
          <strong className="text-white">{ROLE_LABEL[requiredRole] ?? requiredRole}</strong>.
          <br />
          Ton compte est actuellement{' '}
          <strong className="text-white">{ROLE_LABEL[currentRole] ?? currentRole}</strong>.
        </p>
        <p className="mt-3 text-xs text-white/35">
          Si tu utilises un compte joueur pour tester, connecte-toi avec ton compte
          d&apos;organisation.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="h-11 rounded-xl border border-white/12 px-5 py-3 text-sm font-semibold text-white/70 hover:bg-white/5"
          >
            Mon espace
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-rage-gradient px-6 text-sm font-bold text-black shadow-neon hover:brightness-110"
            >
              Changer de compte
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
