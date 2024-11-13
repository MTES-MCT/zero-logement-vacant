#!/usr/bin/env bash

# Abort on error
set -e

if [ -z "$DEV_DB" ] || [ -z "$TEST_DB" ]; then
  echo "Usage: DEV_DB=... TEST_DB=... bash setup.sh"
  exit 1
fi

# The default postgres user
POSTGRES_USER=postgres

dirname=$(dirname "$0")
config="$dirname"/docker-compose.yml
docker compose -f "$config" up -d

dev=$(echo "$DEV_DB" | grep -o '[^/]*$')
test=$(echo "$TEST_DB" | grep -o '[^/]*$')

docker compose -f "$config" exec -T db psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER"  <<-EOSQL
  DROP DATABASE IF EXISTS $dev;
  DROP DATABASE IF EXISTS $test;
  CREATE DATABASE $dev;
  CREATE DATABASE $test;
EOSQL
echo "Databases created."

# Create database structure
echo "Migrating..."
DATABASE_URL="$DEV_DB" yarn workspace @zerologementvacant/server migrate
echo "Seeding..."
DATABASE_URL="$DEV_DB" yarn workspace @zerologementvacant/server seed
