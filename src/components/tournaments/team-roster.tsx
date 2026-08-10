'use client';

import { motion } from 'framer-motion';
import { Check, Clock, Crown, Shield, Users } from 'lucide-react';
import { staggerItem } from '@/components/motion/reveal';
import { RevealGroup } from '@/components/motion/reveal';
import type { PresentedTeam } from '@/lib/queries';
import { cn } from '@/lib/utils';

/**
 * Présentation publique des équipes engagées : encadré logo, nom
 * d'équipe et roster. Seules les équipes validées par un admin
 * remontent jusqu'ici (filtre côté requête).
 */
export function TeamRoster({ teams, accent }: { teams: PresentedTeam[]; accent: string }) {
  return (
    <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <motion.div key={team.id} variants={staggerItem}>
          <div className="glass-card spotlight group h-full p-5 transition-colors hover:border-white/15">
            <div className="flex items-center gap-4">
              {/* Encadré logo */}
              <div
                className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40"
                style={{ boxShadow: `inset 0 0 24px ${accent}22` }}
              >
                {team.hasLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- servi par une route dynamique
                  <img
                    src={`/api/teams/${team.id}/logo`}
                    alt={`Logo ${team.name}`}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain p-1.5"
                  />
                ) : (
                  <Shield className="size-6 text-white/20" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-lg font-bold text-white">
                    {team.tag && <span className="text-white/35">[{team.tag}] </span>}
                    {team.name}
                  </h3>
                  {team.seed != null && (
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 font-display text-[11px] font-bold"
                      style={{ background: `${accent}22`, color: accent }}
                    >
                      #{team.seed}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3" />
                    {team.players.length} joueur{team.players.length > 1 ? 's' : ''}
                  </span>
                  {/* L'équipe est visible dès l'inscription : son état doit
                      l'être aussi, sinon on laisse croire à une place acquise. */}
                  {team.confirmed ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      <Check className="size-2.5" />
                      Confirmée
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rage-yellow/30 bg-rage-yellow/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rage-yellow">
                      <Clock className="size-2.5" />
                      Attente de confirmation
                    </span>
                  )}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-4">
              {team.players.map((p, i) => (
                <li
                  key={`${team.id}-${i}`}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    p.isSubstitute ? 'text-white/35' : 'text-white/75',
                  )}
                >
                  {p.isCaptain ? (
                    <Crown className="size-3.5 shrink-0 text-rage-yellow" />
                  ) : (
                    <span className="size-1.5 shrink-0 rounded-full bg-white/20" />
                  )}
                  <span className="truncate font-medium">{p.pseudo}</span>
                  {p.isSubstitute && (
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide">
                      Remplaçant
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      ))}
    </RevealGroup>
  );
}
