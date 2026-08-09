/**
 * Seed R.A.G.E LAN 2
 * - 9 tournois (données strictes du cahier des charges)
 * - Plan de salle : tables + chaises générées depuis les capacités
 * - 1 compte SUPER_ADMIN + 1 compte ORGANIZER de démo
 *
 *   npm run db:seed
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TOURNAMENTS, distributeChairs } from '../src/lib/tournaments-data';

const prisma = new PrismaClient();

/**
 * Positionne les tables d'une zone sur une grille et place les chaises
 * autour de chaque table. Coordonnées en % du plan (0-100).
 */
function layoutSeats(
  tournamentSlug: string,
  zone: string,
  kind: 'PC' | 'CONSOLE' | 'TABLE_TCG',
  tableCount: number,
  chairCount: number,
  originX: number,
  originY: number,
) {
  const perTable = distributeChairs(tableCount, chairCount);
  const cols = Math.min(5, tableCount);
  const colGap = 15;
  const rowGap = 13;

  const seats: Prisma.SeatCreateManyInput[] = [];
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

async function main() {
  console.log('▶ Seed R.A.G.E LAN 2');

  await prisma.eventSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      eventName: 'R.A.G.E LAN 2',
      registrationsOpen: true,
      venueName: 'Gymnase Daniel Narcisse',
      venueAddress: '97419 La Possession, La Réunion',
    },
  });

  // ── Comptes staff ───────────────────────────────────────────
  const password = await bcrypt.hash('RageLan2!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@ragelan.gg' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'admin@ragelan.gg',
      passwordHash: password,
      firstName: 'Root',
      lastName: 'Admin',
      pseudo: 'R.A.G.E',
      birthDate: new Date('1995-01-01'),
      phone: '+262692000000',
      addressLine: '1 rue du Frag',
      postalCode: '97400',
      city: 'Saint-Denis',
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'staff@ragelan.gg' },
    update: { role: 'ORGANIZER' },
    create: {
      email: 'staff@ragelan.gg',
      passwordHash: password,
      firstName: 'Léa',
      lastName: 'Organisatrice',
      pseudo: 'Staff01',
      birthDate: new Date('1999-06-12'),
      phone: '+262692000001',
      addressLine: '2 rue du Clutch',
      postalCode: '97400',
      city: 'Saint-Denis',
      role: 'ORGANIZER',
      emailVerified: new Date(),
    },
  });

  // ── Tournois + plan de salle ────────────────────────────────
  let originY = 10;

  for (const t of TOURNAMENTS) {
    const tournament = await prisma.tournament.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        tagline: t.tagline,
        platform: t.platform,
        maxPlayers: t.maxPlayers,
        tableCount: t.tableCount,
        chairCount: t.chairCount,
        teamSize: t.teamSize,
        maxTeams: t.maxTeams,
        seatFormat: t.seatFormat,
        playersPerTable: t.playersPerTable,
        formatLabel: t.formatLabel,
        bracketType: t.bracketType,
        entryFeeCents: t.entryFeeCents,
        accentFrom: t.accentFrom,
        accentTo: t.accentTo,
        sortOrder: t.sortOrder,
      },
      create: {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        platform: t.platform,
        maxPlayers: t.maxPlayers,
        tableCount: t.tableCount,
        chairCount: t.chairCount,
        teamSize: t.teamSize,
        maxTeams: t.maxTeams,
        seatFormat: t.seatFormat,
        playersPerTable: t.playersPerTable,
        formatLabel: t.formatLabel,
        bracketType: t.bracketType,
        entryFeeCents: t.entryFeeCents,
        accentFrom: t.accentFrom,
        accentTo: t.accentTo,
        sortOrder: t.sortOrder,
        registrationOpen: true,
      },
    });

    // Arbre principal vide, prêt à être généré côté admin.
    await prisma.bracket.upsert({
      where: { id: tournament.id }, // id partagé : 1 arbre principal par tournoi au seed
      update: {},
      create: {
        id: tournament.id,
        tournamentId: tournament.id,
        name: `${t.name} — Arbre principal`,
        type: t.bracketType,
        status: 'DRAFT',
      },
    });

    const existingSeats = await prisma.seat.count({ where: { tournamentId: tournament.id } });
    if (existingSeats === 0) {
      const seats = layoutSeats(
        t.slug,
        t.zone,
        t.seatKind,
        t.tableCount,
        t.chairCount,
        8,
        originY,
      );
      await prisma.seat.createMany({
        data: seats.map((s) => ({ ...s, tournamentId: tournament.id })),
        skipDuplicates: true,
      });
      console.log(`  ✓ ${t.name.padEnd(14)} ${t.maxPlayers} joueurs · ${seats.length} sièges créés`);
    } else {
      console.log(`  = ${t.name.padEnd(14)} plan de salle déjà présent (${existingSeats} sièges)`);
    }

    const rows = Math.ceil(t.tableCount / Math.min(5, t.tableCount));
    originY += rows * 13 + 6;
    if (originY > 88) originY = 10;

    await prisma.organizerAssignment.upsert({
      where: { userId_tournamentId: { userId: organizer.id, tournamentId: tournament.id } },
      update: {},
      create: { userId: organizer.id, tournamentId: tournament.id },
    });
  }

  console.log('\n✅ Seed terminé.');
  console.log(`   SUPER_ADMIN : admin@ragelan.gg / RageLan2!  (${superAdmin.id})`);
  console.log(`   ORGANIZER   : staff@ragelan.gg / RageLan2!  (${organizer.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
