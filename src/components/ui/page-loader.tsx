'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoaderVisual } from './loader-visual';

/**
 * Écran de chargement du **premier affichage** uniquement.
 *
 * Il est rendu côté serveur, donc visible dès le premier octet, puis se
 * retire une fois React hydraté. Les navigations suivantes sont couvertes
 * par `app/loading.tsx`, que Next affiche exactement pendant l'attente
 * réelle — plutôt qu'un délai fixe qui ralentirait chaque clic.
 *
 * `MIN_VISIBLE_MS` évite le clignotement quand l'hydratation est plus
 * rapide que l'œil : si elle a déjà pris plus longtemps, on masque tout
 * de suite.
 */
const MIN_VISIBLE_MS = 700;

export function PageLoader({ logoSrc }: { logoSrc: string | null }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // `performance.now()` au montage ≈ temps écoulé depuis le début du
    // chargement de la page.
    const elapsed = performance.now();
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    const timer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          // Jamais cliquable : le loader ne doit pas intercepter un clic
          // pendant sa disparition.
          className="pointer-events-none"
        >
          <LoaderVisual logoSrc={logoSrc} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
