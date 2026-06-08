#!/usr/bin/env bash
# Bootstrap de l'exercice "import RS".
#
# À lancer depuis la racine du repo :
#     ./recrutement/setup.sh
#
# Wrapper de convenance — équivalent à :
#     docker compose -f .docker/docker-compose.yml up -d db
#     yarn install --immutable
#     yarn nx run server:migrate
#     yarn nx run server:seed
#
# Durée typique : ~2 à 4 minutes (selon disque et CPU).

set -euo pipefail

cd "$(dirname "$0")/.."

# ---------- Pré-requis ----------
echo "==> Vérification des pré-requis"
for tool in docker yarn node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "  ✗ '$tool' introuvable. Merci de l'installer avant de continuer." >&2
    exit 1
  fi
done

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "  ✗ Node >= 20 requis (24 recommandé). Version actuelle : $(node -v)" >&2
  exit 1
fi
echo "  ✓ docker, yarn, node $(node -v)"

# ---------- Env (défauts sûrs si .env absent) ----------
export NODE_ENV=development
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost/dev}"
export SYSTEM_ACCOUNT="${SYSTEM_ACCOUNT:-system@test.test}"
export AUTH_SECRET="${AUTH_SECRET:-secret}"

# ---------- Docker ----------
echo "==> Démarrage Postgres"
docker compose -f .docker/docker-compose.yml up -d db

echo "==> Attente postgres prêt"
for _ in $(seq 1 30); do
  if docker compose -f .docker/docker-compose.yml exec -T db pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# ---------- Base ----------
DB_NAME=$(echo "$DATABASE_URL" | grep -o '[^/]*$' | sed 's/\?.*$//')
echo "==> (Re)création de la base '$DB_NAME'"
docker compose -f .docker/docker-compose.yml exec -T db \
  psql -v ON_ERROR_STOP=1 --username postgres <<-EOSQL
  DROP DATABASE IF EXISTS $DB_NAME;
  CREATE DATABASE $DB_NAME;
EOSQL

# ---------- Dépendances ----------
echo "==> Installation des dépendances"
yarn install --immutable

echo "==> Build du projet"
yarn build

# ---------- Migrations + seed ----------
echo "==> Migrations"
yarn nx run server:migrate

echo "==> Seed"
yarn nx run server:seed

echo ""
echo "✓ Setup terminé. Ouvrez recrutement/ENONCE.md pour démarrer l'exercice."
