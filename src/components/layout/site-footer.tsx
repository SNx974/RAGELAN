import Link from 'next/link';
import { Gamepad2, Mail, MapPin } from 'lucide-react';
import { Logo } from './logo';

export function SiteFooter({ logoSrc }: { logoSrc: string | null }) {
  return (
    <footer className="mt-24 border-t border-white/[0.07] bg-black/40">
      <div className="neon-divider" />
      <div className="container grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo src={logoSrc} height={56} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            9 tournois, 272 places, deux jours de compétition. PC, consoles et cartes sur
            table — la LAN qui frappe fort.
          </p>
          <div className="mt-5 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-rage-orange" />
              Gymnase Daniel Narcisse — 97419 La Possession
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-rage-orange" />
              contact@ragelan.gg
            </p>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
            Compétition
          </h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {[
              ['Tous les tournois', '/tournois'],
              ['Planning', '/planning'],
              ['Plan de salle', '/plan-de-salle'],
              ['Règlement', '/reglement'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-rage-orange">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white">
            Compte
          </h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {[
              ['Connexion', '/login'],
              ['Créer un compte', '/register'],
              ['Mon espace', '/dashboard'],
              ['Mentions légales', '/mentions-legales'],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-rage-orange">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.05]">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>2026 — Rushxp — R.A.G.E LAN — Tous droits réservés.</p>
          <p className="flex items-center gap-1.5">
            <Gamepad2 className="size-3.5 text-rage-red" />
            SNx DEV
          </p>
        </div>
      </div>
    </footer>
  );
}
