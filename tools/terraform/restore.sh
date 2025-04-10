#!/usr/bin/env bash

# Check that variables are defined
if [ -z "$CLEVER_DATABASE_ID" ]; then
  echo "Error: The variable CLEVER_DATABASE_ID must be defined."
  exit 1
fi

if [ -z "$CLEVER_ORG_ID" ]; then
  echo "Error: The variable CLEVER_ORG_ID must be defined."
  exit 1
fi

# Retrieve and download the latest production backup
BACKUP_ID=$(clever --org "$CLEVER_ORG_ID" database backups "$CLEVER_DATABASE_ID" --format json | jq -r 'max_by(.creationDate) | .backupId')
FILE="$(clever --org "$CLEVER_ORG_ID" database backups "$CLEVER_DATABASE_ID" --format json | jq -r 'max_by(.creationDate) | .creationDate').dump"
clever --org "$CLEVER_ORG_ID" database backups download "$CLEVER_DATABASE_ID" "$BACKUP_ID" --output "$FILE"

# Restore the backup to the brand new database
PGPASSWORD=$(terraform output -json database | jq -r .password)
pg_restore \
  -h "$(terraform output -json database | jq -r .host)" \
  -p "$(terraform output -json database | jq -r .port)" \
  -U "$(terraform output -json database | jq -r .user)" \
  -d "$(terraform output -json database | jq -r .name)" \
  --verbose \
  --no-owner \
  --no-privileges \
  --no-comments \
  --clean \
  --if-exists \
  --format=c \
  "$FILE"
