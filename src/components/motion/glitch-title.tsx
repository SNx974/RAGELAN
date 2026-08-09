'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Titre néon pulsant + glitch subtil.
 * Deux calques décalés en rouge/cyan simulent l'aberration chromatique ;
 * ils sont purement décoratifs donc masqués aux lecteurs d'écran.
 */
export function GlitchTitle({
  text,
  className,
  as: Tag = 'h1',
}: {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'span';
}) {
  return (
    <Tag className={cn('relative inline-block font-display leading-[0.95]', className)}>
      {/* Calque fantôme rouge */}
      <span
        aria-hidden
        className="absolute inset-0 select-none text-rage-red/70 mix-blend-screen animate-glitch-x"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)' }}
      >
        {text}
      </span>
      {/* Calque fantôme jaune */}
      <span
        aria-hidden
        className="absolute inset-0 select-none text-rage-yellow/60 mix-blend-screen animate-glitch-x"
        style={{
          clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
          animationDelay: '.12s',
        }}
      >
        {text}
      </span>
      {/* Calque principal */}
      <span className="relative text-rage-animated drop-shadow-[0_0_25px_rgba(255,107,0,.35)]">
        {text}
      </span>
    </Tag>
  );
}

/** Variante purement néon (sans glitch), pour les titres de section. */
export function NeonTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'font-display text-3xl font-bold tracking-tight text-white animate-neon-pulse sm:text-4xl',
        className,
      )}
    >
      {children}
    </motion.h2>
  );
}
