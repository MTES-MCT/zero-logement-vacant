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
cd server-new && yarn run migrate
echo "Migrated."

docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/001-load-establishments_com_epci_reg_dep.sql -v filePath=data/common/com_epci_dep_reg.csv
echo "EPCI loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/002-load-establishments_direction_territoriale.sql -v filePath=data/common/direction_territoriale.csv
echo "Communes loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/003-load-establishment_kinds.sql -v filePath=data/common/nature_juridique.csv
echo "Directions territoriales loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/004-load-data.sql -v filePath=data/dummy/dummy_data.csv -v dateFormat="'MM/DD/YY'"
echo "Housings loaded."
docker-compose exec -T -w /database db psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f scripts/006-load-locality-taxes.sql -v filePath=data/common/taxe.csv
echo "Taxes loaded."

yarn run seed
echo "Data loaded."
