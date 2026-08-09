/**
 * Seed R.A.G.E LAN 2
 * - 9 tournois (données strictes du cahier des charges)
 * - Plan de salle : tables + chaises générées depuis les capacités
 * - 1 compte SUPER_ADMIN + 1 compte ORGANIZER de démo
 *
 *   npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TOURNAMENTS } from '../src/lib/tournaments-data';
import { layoutSeats, layoutHeight } from '../src/lib/floorplan';

const prisma = new PrismaClient();

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

    originY += layoutHeight(t.tableCount);
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
