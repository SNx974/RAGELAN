'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Calendar, MapPin, Trophy, ChevronDown } from 'lucide-react';
import { GlitchTitle } from '@/components/motion/glitch-title';
import { Button } from '@/components/ui/button';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero({
  totalSeats,
  tournamentCount,
  logoSrc,
}: {
  totalSeats: number;
  tournamentCount: number;
  /** `public/logo.*`. S'il est absent, on retombe sur le titre typographique. */
  logoSrc: string | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Parallaxe : le contenu monte plus vite que le fond et s'estompe.
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden"
    >
      {/* Grille de fond en parallaxe */}
      <motion.div
        aria-hidden
        style={{ y: gridY }}
        className="grid-backdrop absolute inset-0 -top-20"
      />

      {/* Ligne de scan */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan-line bg-gradient-to-b from-transparent via-rage-orange/[0.07] to-transparent"
      />

      {/*
        Halos flottants. On n'anime QUE l'opacité : elle est composée sur le
        GPU sans nouvelle rastérisation. Animer `scale` obligeait le moteur à
        recalculer un flou de 130 px sur 420 px de côté à chaque frame, ce qui
        saccadait toute la page.
      */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-24 top-1/4 size-[420px] rounded-full bg-rage-red/20 blur-[130px] will-change-[opacity]"
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        className="absolute -right-24 bottom-1/4 size-[460px] rounded-full bg-rage-orange/20 blur-[140px] will-change-[opacity]"
      />

      <motion.div
        style={{ y: contentY, opacity }}
        className="container relative z-10 flex flex-col items-center py-24 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-rage-orange/25 bg-rage-orange/[0.08] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rage-orange"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rage-orange opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-rage-orange" />
          </span>
          Inscriptions ouvertes
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        >
          {logoSrc ? (
            // Le logo porte le nom de l'événement : c'est le titre de la page,
            // d'où le h1 autour et le texte alternatif.
            <h1>
              {/* eslint-disable-next-line @next/next/no-img-element -- asset local, ratio libre */}
              <img
                src={logoSrc}
                alt="R.A.G.E LAN 2"
                className="h-auto w-[clamp(260px,64vw,720px)] select-none drop-shadow-[0_0_70px_rgba(255,107,0,.35)]"
              />
            </h1>
          ) : (
            <GlitchTitle
              text="R.A.G.E LAN 2"
              className="text-[clamp(2.75rem,11vw,8rem)] font-bold tracking-[-0.03em]"
            />
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
          className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-white/65 sm:text-xl"
        >
          {tournamentCount} tournois. {totalSeats} places. Un week-end.
          <br className="hidden sm:block" />
          PC, consoles et cartes sur table — viens chercher le trophée.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Button asChild size="lg">
            <Link href="/register">
              <Trophy />
              Je m&apos;inscris
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/tournois">Voir les {tournamentCount} tournois</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-white/45"
        >
          <span className="flex items-center gap-2">
            <Calendar className="size-4 text-rage-orange" />
            23 &amp; 24 octobre 2026
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="size-4 text-rage-orange" />
            Gymnase Daniel Narcisse, La Possession
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/25"
      >
        <ChevronDown className="size-6" />
      </motion.div>
    </section>
  );
}
