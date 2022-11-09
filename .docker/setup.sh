#!/usr/bin/env bash

# Abort on error
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Usage: DATABASE_URL=... bash setup.sh"
  exit 1
fi

# The default postgres user
POSTGRES_USER=postgres
POSTGRES_DB=postgres

docker-compose up -d
echo "Postgres started."
docker-compose exec -T db psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DROP DATABASE zlv;
  DROP DATABASE test_zlv;
  CREATE DATABASE zlv;
  CREATE DATABASE test_zlv;
EOSQL
echo "Databases created."

# Create database structure
npm run migrate-latest
echo "Migrated."

docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/001-load-establishments-localities.sql -v filePath=data/common/epci.csv
echo "Establishments loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/002-load-municipalities-localities.sql -v filePath=data/common/commune.csv
echo "Establishments loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/003-load-data.sql -v filePath=data/dummy/dummy_data.csv -v dateFormat="'MM/DD/YY'"
echo "Housings loaded."

npm run seed
echo "Data loaded."
