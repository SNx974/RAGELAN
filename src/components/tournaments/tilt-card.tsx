'use client';

import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'framer-motion';
import { cn } from '@/lib/utils';

const SPRING = { stiffness: 260, damping: 22, mass: 0.6 };

/**
 * Carte 3D avec tilt + glare qui suivent le curseur.
 * - `mx`/`my` : position normalisée (-0.5 → 0.5)
 * - rotateX/rotateY : dérivées, amorties par un ressort
 * - `--mx`/`--my` : exposées en CSS pour le halo `.spotlight`
 */
export function TiltCard({
  children,
  className,
  intensity = 12,
  glare = true,
  accent = '#FF6B00',
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [intensity, -intensity]), SPRING);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-intensity, intensity]), SPRING);

  // Position du glare, en pourcentage de la carte.
  const glareX = useTransform(mx, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(my, [-0.5, 0.5], ['0%', '100%']);
  const glareBackground = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgba(255,255,255,.14), transparent 45%)`;

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    mx.set(px - 0.5);
    my.set(py - 0.5);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  }

  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div className="perspective-1000">
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY }}
        whileHover={{ scale: 1.025, z: 30 }}
        transition={{ type: 'spring', ...SPRING }}
        className={cn(
          'group relative preserve-3d rounded-2xl',
          'transition-shadow duration-300',
          className,
        )}
      >
        {/* Bordure lumineuse au survol */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(135deg, ${accent}, transparent 55%)`,
            mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            maskComposite: 'exclude',
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            padding: 1,
          }}
        />
        {children}

        {glare && (
          <motion.div
            aria-hidden
            style={{ background: glareBackground }}
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </motion.div>
    </div>
  );
}
