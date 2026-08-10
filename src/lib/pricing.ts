/**
 * Règles de tarification et de réservation.
 *
 * `entryFeeCents` est le prix **par joueur**. Un tournoi en équipe de 5
 * à 20 € coûte donc 100 € au total, répartissables en 5 parts.
 */

export type PricedTournament = {
  entryFeeCents: number;
  teamSize: number;
  reserveThreshold: number;
};

/** Montant dû par une inscription : un joueur solo, ou une équipe entière. */
export function totalDueCents(t: Pick<PricedTournament, 'entryFeeCents' | 'teamSize'>) {
  return t.entryFeeCents * Math.max(1, t.teamSize);
}

/** Montant d'une part individuelle (jeux en équipe). */
export function shareAmountCents(t: Pick<PricedTournament, 'entryFeeCents'>) {
  return t.entryFeeCents;
}

/**
 * La place d'une équipe est réservée à partir de `reserveThreshold`
 * parts réglées (3 par défaut). En deçà, elle reste en liste d'attente
 * et ne consomme aucune place dans la capacité du tournoi.
 */
export function isSeatReserved(paidShares: number, t: Pick<PricedTournament, 'reserveThreshold'>) {
  return paidShares >= t.reserveThreshold;
}

/** L'équipe est intégralement réglée : elle peut être validée par un admin. */
export function isFullyPaid(paidShares: number, t: Pick<PricedTournament, 'teamSize'>) {
  return paidShares >= t.teamSize;
}

export type TeamPaymentState = 'WAITLIST' | 'RESERVED' | 'COMPLETE';

export function teamPaymentState(
  paidShares: number,
  t: Pick<PricedTournament, 'teamSize' | 'reserveThreshold'>,
): TeamPaymentState {
  if (isFullyPaid(paidShares, t)) return 'COMPLETE';
  if (isSeatReserved(paidShares, t)) return 'RESERVED';
  return 'WAITLIST';
}

export const TEAM_STATE_LABEL: Record<TeamPaymentState, string> = {
  WAITLIST: 'Liste d’attente',
  RESERVED: 'Place réservée',
  COMPLETE: 'Intégralement réglée',
};

/**
 * Mention contractuelle affichée **avant** le premier paiement.
 * Présentée après coup, elle ne serait pas opposable.
 */
export function refundNotice(threshold: number) {
  return `À partir de ${threshold} paiements, la place de l’équipe est réservée. En cas d’inscription laissée incomplète, les sommes déjà versées ne sont pas remboursées.`;
}

/** Jeton public d'un lien de paiement : non devinable. */
export function generateShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
