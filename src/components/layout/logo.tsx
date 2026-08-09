import { cn } from '@/lib/utils';

/**
 * Logo officiel R.A.G.E LAN 2.
 *
 * Purement présentationnel (aucun hook) : utilisable aussi bien dans un
 * Server Component que dans un Client Component. La présence du fichier est
 * résolue en amont par `getLogoSrc()` — voir `src/lib/logo.ts`.
 *
 * Dépose le fichier dans `public/logo.png` (ou .svg / .webp).
 */
export function Logo({
  src,
  className,
  height = 40,
}: {
  src: string | null;
  className?: string;
  height?: number;
}) {
  if (!src) return <Wordmark className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset local, dimensions variables
    <img
      src={src}
      alt="R.A.G.E LAN 2"
      height={height}
      style={{ height }}
      className={cn('w-auto object-contain', className)}
    />
  );
}

/** Repli typographique, également utilisable seul. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-rage-gradient font-display text-sm font-bold text-black shadow-neon">
        R
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        <span className="text-rage">R.A.G.E</span>
        <span className="text-white/60"> LAN 2</span>
      </span>
    </span>
  );
}
