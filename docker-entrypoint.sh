#!/bin/sh
# ══════════════════════════════════════════════════════════════
#  Démarrage du conteneur R.A.G.E LAN 2
#  1. Applique les migrations de base de données
#  2. Remplit les 9 tournois + les comptes staff (idempotent)
#  3. Lance le serveur Next.js
# ══════════════════════════════════════════════════════════════
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[X] DATABASE_URL n'est pas defini. Ajoute-le dans les variables Dokploy."
  exit 1
fi

echo "[1/3] Migrations de la base de donnees..."
./node_modules/.bin/prisma migrate deploy

# SEED=false permet de couper le remplissage une fois la LAN lancee.
if [ "${SEED:-true}" = "true" ]; then
  echo "[2/3] Tournois et comptes staff..."
  # Le seed n'utilise que des upserts : le relancer ne duplique rien
  # et n'ecrase pas les inscriptions existantes.
  node seed.cjs
else
  echo "[2/3] Seed desactive (SEED=false)."
fi

echo "[3/3] Demarrage du serveur..."
exec "$@"
