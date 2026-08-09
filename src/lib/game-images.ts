import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Visuels par jeu, résolus depuis `public/games/`.
 *
 * Convention de nommage (slug du tournoi) :
 *   public/games/valorant-card.jpg       → carte de la grille    (1200 × 900,  4:3)
 *   public/games/valorant-banner.jpg     → bandeau fiche tournoi (2560 × 960,  8:3)
 *   public/games/valorant-character.png  → personnage détouré    (PNG transparent, h ≥ 1600)
 *
 * Comme pour le logo, on vérifie l'existence côté serveur : rendre une balise
 * `<img>` vers un fichier absent génère un 404 que l'overlay dev de Next
 * traite pendant le rendu (avertissement React).
 */
const EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'] as const;

/** Le personnage doit être détouré : on n'accepte que des formats à canal alpha. */
const TRANSPARENT_EXTENSIONS = ['png', 'webp'] as const;

export type GameImageKind = 'card' | 'banner' | 'character';

const cache = new Map<string, string | null>();

export function getGameImage(slug: string, kind: GameImageKind): string | null {
  const key = `${slug}-${kind}`;

  if (process.env.NODE_ENV === 'production' && cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const extensions = kind === 'character' ? TRANSPARENT_EXTENSIONS : EXTENSIONS;

  const found = extensions
    .map((ext) => `${key}.${ext}`)
    .find((file) => fs.existsSync(path.join(process.cwd(), 'public', 'games', file)));

  const src = found ? `/games/${found}` : null;
  cache.set(key, src);
  return src;
}
