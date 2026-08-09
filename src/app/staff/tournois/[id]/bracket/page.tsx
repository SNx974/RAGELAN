/**
 * Même écran que côté admin — l'accès est déjà restreint par
 * `requireTournamentAccess` dans les Server Actions, et par le
 * middleware (niveau ORGANIZER) pour la route.
 */
export { default, dynamic } from '@/app/admin/tournois/[id]/bracket/page';
