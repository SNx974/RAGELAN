'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X, Shield, Headphones, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import type { SessionPayload } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Accueil' },
  { href: '/tournois', label: 'Tournois' },
  { href: '/planning', label: 'Planning' },
  { href: '/plan-de-salle', label: 'Plan de salle' },
  { href: '/infos', label: 'Infos pratiques' },
];

export function SiteHeader({
  session,
  logoSrc,
}: {
  session: SessionPayload | null;
  logoSrc: string | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));
  useEffect(() => setOpen(false), [pathname]);

  const isStaff = session && session.role !== 'PLAYER';

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-white/[0.07] bg-abyss/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center" aria-label="R.A.G.E LAN 2 — accueil">
          <motion.span
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            className="flex items-center"
          >
            <Logo
              src={logoSrc}
              height={40}
              className="drop-shadow-[0_0_18px_rgba(255,107,0,.35)]"
            />
          </motion.span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active ? 'text-white' : 'text-muted-foreground hover:text-white',
                )}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-rage-gradient"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {isStaff && (
            <Button asChild variant="ghost" size="sm">
              <Link href={session.role === 'ORGANIZER' ? '/staff' : '/admin'}>
                {session.role === 'ORGANIZER' ? <Headphones /> : <Shield />}
                {session.role === 'ORGANIZER' ? 'Staff' : 'Admin'}
              </Link>
            </Button>
          )}
          {session ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <LayoutDashboard />
                {session.name.split(' ')[0]}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">
                  <LogIn />
                  Connexion
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">
                  <UserPlus />
                  S&apos;inscrire
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/[0.07] bg-abyss/95 backdrop-blur-xl lg:hidden"
          >
            <nav className="container flex flex-col gap-1 py-4">
              {NAV.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-3 flex gap-2">
                {session ? (
                  <Button asChild className="flex-1">
                    <Link href="/dashboard">Mon espace</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href="/login">Connexion</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href="/register">S&apos;inscrire</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
