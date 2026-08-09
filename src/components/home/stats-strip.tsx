'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';

/** Compteur qui s'anime une fois le bloc entré dans le viewport. */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const value = useMotionValue(0);
  const spring = useSpring(value, { stiffness: 60, damping: 18 });
  const rounded = useTransform(spring, (v) => Math.round(v).toLocaleString('fr-FR'));

  useEffect(() => {
    if (inView) value.set(to);
  }, [inView, to, value]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

export function StatsStrip({
  players,
  tournaments,
  registered,
}: {
  players: number;
  tournaments: number;
  registered: number;
}) {
  const items = [
    { value: players, label: 'places joueurs' },
    { value: tournaments, label: 'tournois' },
    { value: registered, label: 'déjà inscrits' },
  ];

  return (
    <section className="border-y border-white/[0.07] bg-black/40 py-12">
      <div className="container grid grid-cols-3 gap-8">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <p className="font-display text-4xl font-bold text-rage sm:text-5xl">
              <Counter to={item.value} />
            </p>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              {item.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
