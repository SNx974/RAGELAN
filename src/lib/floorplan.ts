import { distributeChairs } from './tournaments-data';

export type SeatLayout = {
  zone: string;
  kind: 'PC' | 'CONSOLE' | 'TABLE_TCG';
  tableLabel: string;
  seatLabel: string;
  x: number;
  y: number;
  rotation: number;
};

/**
 * Positionne les tables d'une zone sur une grille et place les chaises
 * autour de chaque table. Coordonnées en % du plan (0-100).
 *
 * Partagé par le seed et l'édition admin : changer le nombre de tables ou
 * de chaises d'un tournoi doit produire exactement le même plan que la
 * génération initiale.
 */
export function layoutSeats(
  tournamentSlug: string,
  zone: string,
  kind: SeatLayout['kind'],
  tableCount: number,
  chairCount: number,
  originX = 8,
  originY = 10,
): SeatLayout[] {
  const perTable = distributeChairs(tableCount, chairCount);
  const cols = Math.min(5, tableCount);
  const colGap = 15;
  const rowGap = 13;

  const seats: SeatLayout[] = [];
  const prefix = tournamentSlug.slice(0, 3).toUpperCase();

  perTable.forEach((chairs, tableIndex) => {
    const col = tableIndex % cols;
    const row = Math.floor(tableIndex / cols);
    const tx = originX + col * colGap;
    const ty = originY + row * rowGap;
    const tableLabel = `${prefix}-T${String(tableIndex + 1).padStart(2, '0')}`;

    // Chaises réparties en deux rangées de part et d'autre de la table.
    const half = Math.ceil(chairs / 2);
    for (let c = 0; c < chairs; c++) {
      const isTopRow = c < half;
      const idxInRow = isTopRow ? c : c - half;
      const rowSize = isTopRow ? half : chairs - half;
      const spread = 9;
      const x = tx + (rowSize > 1 ? (idxInRow / (rowSize - 1) - 0.5) * spread : 0);
      const y = ty + (isTopRow ? -3.2 : 3.2);

      seats.push({
        zone,
        kind,
        tableLabel,
        seatLabel: `${tableLabel}-C${c + 1}`,
        x: Math.round(Math.max(0, Math.min(100, x)) * 100) / 100,
        y: Math.round(Math.max(0, Math.min(100, y)) * 100) / 100,
        rotation: isTopRow ? 180 : 0,
      });
    }
  });

  return seats;
}

/** Hauteur occupée par le plan d'un tournoi, pour empiler les zones. */
export function layoutHeight(tableCount: number) {
  const rows = Math.ceil(tableCount / Math.min(5, tableCount));
  return rows * 13 + 6;
}
