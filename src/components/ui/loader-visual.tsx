import { cn } from '@/lib/utils';

/**
 * Habillage de l'écran de chargement.
 *
 * Purement présentationnel (aucun hook) : partagé par le loader client
 * du premier affichage et par `app/loading.tsx` pour les navigations,
 * afin que les deux soient rigoureusement identiques à l'écran.
 *
 * Contrainte de perf tenue partout : seules `opacity` et `transform`
 * sont animées, les deux étant composées sur le GPU. Aucun `width`,
 * aucun `filter` animé — c'est ce qui saccadait le hero auparavant.
 */
export function LoaderVisual({
  logoSrc,
  className,
}: {
  logoSrc: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex select-none items-center justify-center overflow-hidden',
        'bg-abyss/95 p-6 backdrop-blur-2xl',
        className,
      )}
    >
      {/* Grille discrète, reprise de l'ambiance du site */}
      <div aria-hidden className="grid-backdrop absolute inset-0 opacity-60" />

      {/* Halo : flou statique rastérisé une fois, seule l'opacité varie */}
      <div
        aria-hidden
        className="pointer-events-none absolute size-[520px] max-w-full animate-loader-halo rounded-full bg-rage-orange/25 blur-[130px] will-change-[opacity]"
      />

      <div className="relative z-10 flex flex-col items-center gap-9">
        {/* Logo encadré de quatre équerres, clin d'œil e-sport */}
        <div className="relative animate-loader-in px-8 py-4">
          <Corner className="left-0 top-0 border-l-2 border-t-2" />
          <Corner className="right-0 top-0 border-r-2 border-t-2" />
          <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
          <Corner className="bottom-0 right-0 border-b-2 border-r-2" />

          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- asset local, ratio libre
            <img
              src={logoSrc}
              alt=""
              aria-hidden
              className="h-auto max-h-[38vh] w-[min(70vw,340px)] object-contain drop-shadow-[0_0_60px_rgba(255,107,0,.55)]"
            />
          ) : (
            <span className="font-display text-5xl font-black tracking-tight text-white sm:text-7xl">
              R.A.G.E<span className="text-rage-orange"> LAN</span>
            </span>
          )}
        </div>

        <div className="flex flex-col items-center gap-3.5">
          {/* Rail + remplissage en scaleX, doublé d'un reflet qui balaie */}
          <div className="relative h-[3px] w-[min(78vw,300px)] overflow-hidden rounded-full bg-white/[0.09]">
            <div className="h-full origin-left animate-loader-bar rounded-full bg-gradient-to-r from-rage-red via-rage-orange to-rage-yellow shadow-[0_0_16px_rgba(255,107,0,.8)]" />
            <div
              aria-hidden
              className="absolute inset-y-0 -left-1/3 w-1/3 animate-loader-shine bg-gradient-to-r from-transparent via-white/70 to-transparent"
            />
          </div>

          <span className="animate-loader-halo text-[10px] font-semibold uppercase tracking-[0.4em] text-white/50">
            Chargement
          </span>
        </div>
      </div>

      <span className="sr-only" role="status">
        Chargement en cours
      </span>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn('absolute size-5 border-rage-orange/70', className)}
    />
  );
}
