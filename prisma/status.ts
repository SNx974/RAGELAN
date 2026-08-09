/**
 * État de la base, affiché à chaque démarrage du conteneur.
 *
 * Sans ça, un site qui répond mais dont la base est vide est
 * indiscernable d'un site sain : les pages publiques retombent sur les
 * données statiques, et la page de connexion ne révèle jamais si un
 * compte existe (protection contre l'énumération).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [tournaments, users, admins, teams, registrations] = await Promise.all([
    prisma.tournament.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
    prisma.team.count(),
    prisma.registration.count(),
  ]);

  console.log('      ─────────────────────────────────────────');
  console.log(`      Tournois       : ${tournaments}`);
  console.log(`      Comptes        : ${users}`);
  console.log(`      Dont admins    : ${admins}`);
  console.log(`      Equipes        : ${teams}`);
  console.log(`      Inscriptions   : ${registrations}`);
  console.log('      ─────────────────────────────────────────');

  if (admins === 0) {
    console.log('');
    console.log('      /!\\  AUCUN COMPTE ADMIN EN BASE.');
    console.log('           Personne ne peut acceder a /admin.');
    console.log('           Corrige en passant SEED=true puis redeploie.');
    console.log('');
  }
  if (tournaments === 0) {
    console.log('      /!\\  AUCUN TOURNOI EN BASE : SEED=true necessaire.');
  }
}

main()
  .catch((e) => {
    // Purement informatif : ne doit jamais empecher le demarrage.
    console.warn('      (etat de la base indisponible)', e?.message ?? e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
