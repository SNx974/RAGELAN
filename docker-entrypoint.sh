#!/bin/sh
# ══════════════════════════════════════════════════════════════
#  Démarrage du conteneur R.A.G.E LAN 2
#  1. Attend que PostgreSQL réponde
#  2. Applique les migrations
#  3. Remplit les 9 tournois + les comptes staff (idempotent)
#  4. Lance le serveur Next.js
# ══════════════════════════════════════════════════════════════
set -e

PRISMA=./node_modules/.bin/prisma

if [ -z "$DATABASE_URL" ]; then
  echo "[X] DATABASE_URL n'est pas defini. Ajoute-le dans les variables Dokploy."
  exit 1
fi

# ── 1. Attente de la base ─────────────────────────────────────
# Sans cela, un demarrage plus rapide que celui de PostgreSQL coupe la
# migration en plein milieu et laisse une entree "failed" dans
# _prisma_migrations : les deploiements suivants echouent alors en P3009.
echo "[1/4] Attente de PostgreSQL..."
i=1
until echo 'SELECT 1;' | "$PRISMA" db execute --url "$DATABASE_URL" --stdin > /dev/null 2>&1; do
  if [ "$i" -ge 30 ]; then
    echo "[X] Base injoignable apres 60 s."
    echo "    Verifie DATABASE_URL : hote INTERNE (pas localhost), mot de passe,"
    echo "    et que le service PostgreSQL est demarre dans Dokploy."
    exit 1
  fi
  echo "    ...tentative $i/30"
  i=$((i + 1))
  sleep 2
done
echo "      Base prete."

# ── Remise a zero (opt-in explicite) ──────────────────────────
# Depannage d'un P3009 sans terminal PostgreSQL sous la main.
# DESTRUCTIF : supprime toutes les tables et toutes les donnees.
# A retirer des variables Dokploy immediatement apres usage.
if [ "$DB_RESET" = "true" ]; then
  echo ""
  echo "  ############################################################"
  echo "  #  DB_RESET=true                                           #"
  echo "  #  Suppression de TOUTES les tables et de TOUTES les       #"
  echo "  #  donnees (inscriptions comprises).                       #"
  echo "  #  Retire cette variable des maintenant.                   #"
  echo "  ############################################################"
  echo ""
  printf 'DROP SCHEMA IF EXISTS public CASCADE;\nCREATE SCHEMA public;\n' \
    | "$PRISMA" db execute --url "$DATABASE_URL" --stdin
  echo "      Schema remis a zero."
fi

# ── 2. Migrations ─────────────────────────────────────────────
echo "[2/4] Migrations de la base de donnees..."
if ! "$PRISMA" migrate deploy; then
  echo ""
  echo "[X] Echec des migrations."
  echo ""
  echo "    Si l'erreur est P3009 (migration precedente en echec), la base"
  echo "    contient un etat partiel. Tant qu'il n'y a pas de donnees a"
  echo "    conserver, remets-la a zero :"
  echo ""
  echo "      - soit depuis un terminal PostgreSQL :"
  echo "          DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  echo ""
  echo "      - soit en ajoutant la variable DB_RESET=true dans Dokploy,"
  echo "        en redeployant, PUIS en retirant la variable."
  echo ""
  echo "    puis relance le deploiement."
  exit 1
fi

# ── 3. Seed ───────────────────────────────────────────────────
# SEED=false coupe le remplissage une fois la LAN lancee.
if [ "${SEED:-true}" = "true" ]; then
  echo "[3/4] Tournois et comptes staff..."
  # Le seed n'utilise que des upserts : le relancer ne duplique rien
  # et n'ecrase pas les inscriptions existantes.
  node seed.cjs
else
  echo "[3/4] Seed desactive (SEED=false)."
fi

echo "[4/4] Demarrage du serveur..."
exec "$@"
