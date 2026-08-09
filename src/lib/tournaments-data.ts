/**
 * Source de vérité des 9 tournois de la R.A.G.E LAN 2.
 * Consommé par le seed Prisma ET par le front (fallback statique).
 */
export type SeedTournament = {
  slug: string;
  name: string;
  tagline: string;
  platform: 'PC' | 'Console' | 'Table';
  maxPlayers: number;
  tableCount: number;
  chairCount: number;
  teamSize: number;
  maxTeams: number;
  seatFormat: 'FIXED' | 'ROTATION';
  playersPerTable: number | null;
  formatLabel: string;
  bracketType:
    | 'SINGLE_ELIMINATION'
    | 'DOUBLE_ELIMINATION'
    | 'GROUPS_THEN_PLAYOFFS'
    | 'ROUND_ROBIN'
    | 'SWISS';
  entryFeeCents: number;
  accentFrom: string;
  accentTo: string;
  seatKind: 'PC' | 'CONSOLE' | 'TABLE_TCG';
  zone: string;
  sortOrder: number;
};

export const TOURNAMENTS: SeedTournament[] = [
  {
    slug: 'valorant',
    name: 'Valorant',
    tagline: 'Le tournoi phare. 8 équipes, un seul trophée.',
    platform: 'PC',
    maxPlayers: 40,
    tableCount: 20,
    chairCount: 40,
    teamSize: 5,
    maxTeams: 8,
    seatFormat: 'FIXED',
    playersPerTable: 2,
    formatLabel: '8 équipes · 5v5 · places fixes',
    bracketType: 'DOUBLE_ELIMINATION',
    entryFeeCents: 1500,
    accentFrom: '#FF2A2A',
    accentTo: '#FF4655',
    seatKind: 'PC',
    zone: 'Zone PC — Arène A',
    sortOrder: 1,
  },
  {
    slug: 'rocket-league',
    name: 'Rocket League',
    tagline: 'Bagnoles, fusée, aerials. 3v3 sans pitié.',
    platform: 'PC',
    maxPlayers: 24,
    tableCount: 12,
    chairCount: 24,
    teamSize: 3,
    maxTeams: 8,
    seatFormat: 'FIXED',
    playersPerTable: 2,
    formatLabel: '8 équipes · 3v3 · places fixes',
    bracketType: 'DOUBLE_ELIMINATION',
    entryFeeCents: 1200,
    accentFrom: '#FF6B00',
    accentTo: '#0090FF',
    seatKind: 'PC',
    zone: 'Zone PC — Arène B',
    sortOrder: 2,
  },
  {
    slug: 'tft',
    name: 'TFT',
    tagline: 'Teamfight Tactics — 8 joueurs, un seul top 1.',
    platform: 'PC',
    maxPlayers: 16,
    tableCount: 8,
    chairCount: 16,
    teamSize: 1,
    maxTeams: 0,
    seatFormat: 'FIXED',
    playersPerTable: 2,
    formatLabel: 'Solo · places fixes',
    bracketType: 'SWISS',
    entryFeeCents: 1000,
    accentFrom: '#FFC700',
    accentTo: '#FF6B00',
    seatKind: 'PC',
    zone: 'Zone PC — Tacticiens',
    sortOrder: 3,
  },
  {
    slug: 'fortnite',
    name: 'Fortnite',
    tagline: 'Duos. Construis vite ou meurs lentement.',
    platform: 'PC',
    maxPlayers: 32,
    tableCount: 4,
    chairCount: 8,
    teamSize: 2,
    maxTeams: 16,
    seatFormat: 'ROTATION',
    playersPerTable: 2,
    formatLabel: '2v2 · rotation sur 8 postes',
    bracketType: 'GROUPS_THEN_PLAYOFFS',
    entryFeeCents: 1000,
    accentFrom: '#FF2A2A',
    accentTo: '#8B5CF6',
    seatKind: 'PC',
    zone: 'Zone PC — Rotation',
    sortOrder: 4,
  },
  {
    slug: 'tcg',
    name: 'TCG',
    tagline: 'Cartes sur table. 6 duellistes par table.',
    platform: 'Table',
    maxPlayers: 40,
    tableCount: 7,
    chairCount: 40,
    teamSize: 1,
    maxTeams: 0,
    seatFormat: 'FIXED',
    playersPerTable: 6,
    formatLabel: '6 joueurs/table · places fixes',
    bracketType: 'SWISS',
    entryFeeCents: 800,
    accentFrom: '#FFC700',
    accentTo: '#FF2A2A',
    seatKind: 'TABLE_TCG',
    zone: 'Espace TCG',
    sortOrder: 5,
  },
  {
    slug: 'ssbu',
    name: 'SSBU',
    tagline: 'Super Smash Bros. Ultimate — 1v1, no items, Final Destination.',
    platform: 'Console',
    maxPlayers: 32,
    tableCount: 2,
    chairCount: 4,
    teamSize: 1,
    maxTeams: 0,
    seatFormat: 'ROTATION',
    playersPerTable: 2,
    formatLabel: '1v1 · rotation sur 4 postes',
    bracketType: 'DOUBLE_ELIMINATION',
    entryFeeCents: 800,
    accentFrom: '#FF6B00',
    accentTo: '#FFC700',
    seatKind: 'CONSOLE',
    zone: 'Zone Console — Versus',
    sortOrder: 6,
  },
  {
    slug: 'mario-kart',
    name: 'Mario Kart',
    tagline: 'Carapace bleue à 3 mètres de la ligne. Encore.',
    platform: 'Console',
    maxPlayers: 24,
    tableCount: 2,
    chairCount: 8,
    teamSize: 1,
    maxTeams: 0,
    seatFormat: 'ROTATION',
    playersPerTable: 4,
    formatLabel: 'Multi-postes · rotation',
    bracketType: 'GROUPS_THEN_PLAYOFFS',
    entryFeeCents: 600,
    accentFrom: '#FF2A2A',
    accentTo: '#FFC700',
    seatKind: 'CONSOLE',
    zone: 'Zone Console — Circuits',
    sortOrder: 7,
  },
  {
    slug: 'tekken-8',
    name: 'Tekken 8',
    tagline: 'King of Iron Fist. Frame data ou souffrance.',
    platform: 'Console',
    maxPlayers: 32,
    tableCount: 2,
    chairCount: 4,
    teamSize: 1,
    maxTeams: 0,
    seatFormat: 'ROTATION',
    playersPerTable: 2,
    formatLabel: '1v1 · rotation sur 4 postes',
    bracketType: 'DOUBLE_ELIMINATION',
    entryFeeCents: 800,
    accentFrom: '#FF2A2A',
    accentTo: '#FF6B00',
    seatKind: 'CONSOLE',
    zone: 'Zone Console — Versus',
    sortOrder: 8,
  },
  {
    slug: 'fc27',
    name: 'FC27',
    tagline: 'Le foot, la tension, le 1-0 à la 90e.',
    platform: 'Console',
    maxPlayers: 32,
    tableCount: 2,
    chairCount: 8,
    teamSize: 1,
    maxTeams: 0,
    seatFormat: 'ROTATION',
    playersPerTable: 4,
    formatLabel: 'Rotation sur 8 postes',
    bracketType: 'SINGLE_ELIMINATION',
    entryFeeCents: 800,
    accentFrom: '#FF6B00',
    accentTo: '#00D26A',
    seatKind: 'CONSOLE',
    zone: 'Zone Console — Stade',
    sortOrder: 9,
  },
];

/** Répartit `chairCount` chaises sur `tableCount` tables, au plus juste. */
export function distributeChairs(tableCount: number, chairCount: number): number[] {
  const base = Math.floor(chairCount / tableCount);
  const extra = chairCount % tableCount;
  return Array.from({ length: tableCount }, (_, i) => base + (i < extra ? 1 : 0));
}
