'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, ArrowUpRight, Lock, Gamepad2, Monitor, Layers } from 'lucide-react';
import { TiltCard } from './tilt-card';
import { Badge } from '@/components/ui/badge';
import { staggerItem } from '@/components/motion/reveal';
import { cn, formatPrice } from '@/lib/utils';

/**
 * Vue publique d'un tournoi. Les capacités matérielles
 * (tables, chaises) sont volontairement absentes : elles ne servent
 * qu'à l'organisation et restent dans l'espace admin.
 */
export type TournamentCardData = {
  slug: string;
  name: string;
  tagline: string;
  platform: string;
  maxPlayers: number;
  teamSize: number;
  formatLabel: string;
  entryFeeCents: number;
  accentFrom: string;
  accentTo: string;
  registrationOpen: boolean;
  registered: number;
  /** `public/games/<slug>-card.*` — 1200 × 900 (4:3). */
  coverImage: string | null;
};

const PLATFORM_ICON: Record<string, typeof Monitor> = {
  PC: Monitor,
  Console: Gamepad2,
  Table: Layers,
};

export function TournamentCard({ tournament: t }: { tournament: TournamentCardData }) {
  const fillRatio = Math.min(1, t.registered / t.maxPlayers);
  const isFull = t.registered >= t.maxPlayers;
  const slotsLeft = Math.max(0, t.maxPlayers - t.registered);
  const PlatformIcon = PLATFORM_ICON[t.platform] ?? Monitor;

  return (
    <motion.div variants={staggerItem}>
      <TiltCard accent={t.accentFrom}>
        <Link
          href={`/tournois/${t.slug}`}
          className="glass-card spotlight block h-full p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rage-orange"
        >
          {/* Visuel du jeu, sous le verre. Il se révèle au survol. */}
          {t.coverImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- asset local, ratio libre */}
              <img
                src={t.coverImage}
                alt=""
                aria-hidden
                // `lazy` + `async` : sans cela les 9 visuels sont décodés d'un
                // bloc sur le thread principal au chargement de la grille.
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute inset-0 size-full scale-105 object-cover opacity-30 transition-all duration-700 group-hover:scale-110 group-hover:opacity-50"
              />
              {/* Voile sombre : garantit la lisibilité du texte par-dessus. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-abyss via-abyss/85 to-abyss/40"
              />
            </>
          )}

          {/* Voile de couleur propre au jeu */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.09] transition-opacity duration-500 group-hover:opacity-[0.18]"
            style={{
              background: `linear-gradient(135deg, ${t.accentFrom} 0%, ${t.accentTo} 100%)`,
            }}
          />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${t.accentFrom}33, ${t.accentTo}1a)`,
                }}
              >
                <PlatformIcon className="size-5" style={{ color: t.accentFrom }} />
              </div>

              {t.registrationOpen && !isFull ? (
                <Badge variant={slotsLeft <= 5 ? 'red' : 'success'}>
                  {slotsLeft <= 5 ? `${slotsLeft} places` : 'Ouvert'}
                </Badge>
              ) : (
                <Badge variant="neutral">
                  <Lock className="size-3" />
                  {isFull ? 'Complet' : 'Fermé'}
                </Badge>
              )}
            </div>

            <h3
              className="mt-5 font-display text-2xl font-bold tracking-tight text-white transition-colors"
              style={{ textShadow: `0 0 0px ${t.accentFrom}` }}
            >
              {t.name}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.tagline}</p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Stat icon={Users} value={t.maxPlayers} label="joueurs" />
              <Stat icon={PlatformIcon} value={t.platform} label="plateforme" />
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-white/45">
              {t.formatLabel}
            </p>

            {/* Jauge de remplissage */}
            <div className="mt-auto pt-5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>
                  {t.registered} / {t.maxPlayers} inscrits
                </span>
                <span className="text-white">
                  {t.entryFeeCents > 0 ? (
                    <>
                      {formatPrice(t.entryFeeCents)}
                      {/* Le prix affiché est celui d'un joueur : sur un jeu
                          en équipe, le total est un multiple. */}
                      {t.teamSize > 1 && (
                        <span className="font-normal text-white/40"> / joueur</span>
                      )}
                    </>
                  ) : (
                    'Gratuit'
                  )}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${t.accentFrom}, ${t.accentTo})`,
                  }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${fillRatio * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
              </div>
            </div>

            <div
              className={cn(
                'mt-4 flex items-center gap-1.5 text-sm font-semibold',
                'text-white/50 transition-all duration-300 group-hover:gap-2.5 group-hover:text-white',
              )}
            >
              Voir le tournoi
              <ArrowUpRight className="size-4" />
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-2 text-center">
      <Icon className="mx-auto mb-1 size-3.5 text-white/35" />
      <p className="font-display text-base font-bold leading-none text-white">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/35">{label}</p>
    </div>
  );
}
