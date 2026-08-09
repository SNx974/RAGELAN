import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

/** Formats acceptés, par ordre de préférence. */
const CANDIDATES = ['logo.svg', 'logo.png', 'logo.webp'] as const;

let cached: string | null | undefined;

/**
 * Résout le logo présent dans `public/`, ou `null` s'il n'y en a pas.
 *
 * On tranche côté serveur plutôt que via un `onError` client : rendre une
 * `<img>` vers un fichier absent déclenche un 404 que l'overlay dev de Next
 * traite pendant le rendu, ce qui provoque un avertissement React.
 */
export function getLogoSrc(): string | null {
  // En dev on relit à chaque fois : déposer le fichier suffit, sans redémarrer.
  if (process.env.NODE_ENV === 'production' && cached !== undefined) return cached;

  const found = CANDIDATES.find((file) =>
    fs.existsSync(path.join(process.cwd(), 'public', file)),
  );

  cached = found ? `/${found}` : null;
  return cached;
}
