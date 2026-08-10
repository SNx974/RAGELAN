/**
 * Référence lisible d'un participant : `RAGE-7K2M9Q`.
 *
 * C'est le contenu du QR code et la clé de recherche pour un check-in
 * manuel. Elle doit donc se dicter au téléphone et se retaper sans
 * ambiguïté.
 */

/**
 * Alphabet Crockford : ni I, L, O, U.
 * Le 1 et le I, le 0 et le O se confondent à l'oral comme à l'écrit ;
 * le U est retiré pour éviter de former des mots involontaires.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 6;

export const REFERENCE_PREFIX = 'RAGE-';

export function generateReference(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return REFERENCE_PREFIX + code;
}

/**
 * Normalise une saisie manuelle : casse, espaces, préfixe absent, et
 * les confusions classiques (O→0, I/L→1).
 */
export function normalizeReference(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^RAGE-?/, '')
    // Q appartient à l'alphabet : on ne touche qu'aux lettres exclues.
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

  return REFERENCE_PREFIX + cleaned;
}

export function isValidReference(value: string): boolean {
  const code = value.replace(REFERENCE_PREFIX, '');
  return code.length === LENGTH && [...code].every((c) => ALPHABET.includes(c));
}
