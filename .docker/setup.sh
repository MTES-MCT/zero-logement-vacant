#!/usr/bin/env bash

# Abort on error
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Usage: DATABASE_URL=... bash setup.sh"
  exit 1
fi

# The default postgres user
POSTGRES_USER=postgres

docker-compose up -d
echo "Postgres started."
docker-compose exec -T db psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER"  <<-EOSQL
  DROP DATABASE IF EXISTS zlv;
  DROP DATABASE IF EXISTS test_zlv;
  CREATE DATABASE zlv;
  CREATE DATABASE test_zlv;
EOSQL
echo "Databases created."

# Create database structure
npm run migrate-latest
echo "Migrated."

docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/001-load-establishments_epci.sql -v filePath=data/common/epci.csv
echo "EPCI loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/002-load-establishments_commune.sql -v filePath=data/common/commune.csv
echo "Communes loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/003-load-establishments_direction_territoriale.sql -v filePath=data/common/direction_territoriale.csv
echo "Directions territoriales loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/004-load-data.sql -v filePath=data/dummy/dummy_data.csv -v dateFormat="'MM/DD/YY'"
echo "Housings loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/006-load-locality-taxes.sql -v filePath=data/common/taxe.csv
echo "Taxes loaded."

npm run seed
echo "Data loaded."
