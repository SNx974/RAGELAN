import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  Users,
  MapPinned,
  FileText,
  ShieldCheck,
  Settings,
  ScanLine,
  Wallet,
} from 'lucide-react';
import { getViewer, hasRole } from '@/lib/auth';
import { AccessDenied } from '@/components/layout/access-denied';

const LINKS = [
  { href: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/tournois', label: 'Tournois & arbres', icon: Trophy },
  { href: '/staff/scan', label: 'Scan & pointage', icon: ScanLine },
  { href: '/admin/equipes', label: 'Équipes à valider', icon: ShieldCheck },
  { href: '/admin/inscriptions', label: 'Inscriptions', icon: FileText },
  { href: '/admin/participants', label: 'Participants', icon: Users },
  { href: '/admin/paiements', label: 'Paiements', icon: Wallet },
  { href: '/admin/placement', label: 'Plan de salle', icon: MapPinned },
  { href: '/admin/staff', label: 'Staff & accès', icon: ShieldCheck },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // `getViewer` confronte le jeton à la base : un cookie survivant à une
  // remise à zéro ne doit pas donner l'illusion d'une session valide.
  const session = await getViewer();
  if (!session) redirect('/login?next=/admin');
  if (!hasRole(session.role, 'ADMIN')) {
    return (
      <AccessDenied currentRole={session.role} requiredRole="ADMIN" area="L’espace admin" />
    );
  }

  return (
    <div className="container grid gap-6 py-6 lg:grid-cols-[236px_1fr] lg:gap-8 lg:py-10">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
        <div className="mb-4 lg:mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
            Administration
          </p>
          <p className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
            {session.name}
          </p>
          <p className="text-xs text-white/35">{session.role}</p>
        </div>
        {/*
          Mobile : rail de pastilles défilant horizontalement. Le débord
          négatif fait toucher le bord de l'écran, ce qui rend le défilement
          visible au lieu de laisser croire à une liste tronquée.
        */}
        <nav
          className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-lg border border-white/[0.08] px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white lg:border-0 lg:px-3"
            >
              <link.icon className="size-4 shrink-0" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
