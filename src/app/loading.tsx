import { LoaderVisual } from '@/components/ui/loader-visual';
import { getLogoSrc } from '@/lib/logo';

/**
 * Fallback Suspense de l'App Router.
 *
 * Next l'affiche pendant la durée réelle du rendu serveur, en début de
 * chargement comme lors des navigations. Aucun délai artificiel : il
 * disparaît dès que la page est prête.
 */
export default function GlobalLoading() {
  return <LoaderVisual logoSrc={getLogoSrc()} />;
}
