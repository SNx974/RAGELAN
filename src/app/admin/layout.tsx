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
} from 'lucide-react';
import { getSession, hasRole } from '@/lib/auth';

const LINKS = [
  { href: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/tournois', label: 'Tournois & arbres', icon: Trophy },
  { href: '/admin/inscriptions', label: 'Inscriptions', icon: FileText },
  { href: '/admin/placement', label: 'Plan de salle', icon: MapPinned },
  { href: '/admin/staff', label: 'Staff & accès', icon: ShieldCheck },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !hasRole(session.role, 'ADMIN')) redirect('/login?next=/admin');

  return (
    <div className="container grid gap-8 py-10 lg:grid-cols-[236px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
            Administration
          </p>
          <p className="mt-1 font-display text-xl font-bold text-white">{session.name}</p>
          <p className="text-xs text-white/35">{session.role}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
