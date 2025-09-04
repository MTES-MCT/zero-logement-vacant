#!/usr/bin/env bash

# PostgreSQL backup restoration script
# Restores a backup from Clever Cloud to a target database specified by URI

set -e

# Check that required variables are defined
if [ -z "$CLEVER_DATABASE_ID" ]; then
  echo "Error: The variable CLEVER_DATABASE_ID must be defined."
  exit 1
fi

if [ -z "$CLEVER_ORG_ID" ]; then
  echo "Error: The variable CLEVER_ORG_ID must be defined."
  exit 1
fi

if [ -z "$TARGET_DATABASE_URI" ]; then
  echo "Error: The variable TARGET_DATABASE_URI must be defined."
  echo "Example: TARGET_DATABASE_URI='postgresql://user:password@host:port/database'"
  exit 1
fi

# Parse the DATABASE_URI to extract connection parameters
parse_database_uri() {
  local uri="$1"
  
  # Remove postgresql:// prefix
  uri="${uri#postgresql://}"
  uri="${uri#postgres://}"
  
  # Extract user:password@host:port/database
  if [[ "$uri" =~ ^([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
    export DB_USER="${BASH_REMATCH[1]}"
    export DB_PASSWORD="${BASH_REMATCH[2]}"
    export DB_HOST="${BASH_REMATCH[3]}"
    export DB_PORT="${BASH_REMATCH[4]}"
    export DB_NAME="${BASH_REMATCH[5]}"
  else
    echo "Error: Invalid DATABASE_URI format. Expected: postgresql://user:password@host:port/database"
    exit 1
  fi
}

# Parse the target database URI
echo "Parsing target database URI..."
parse_database_uri "$TARGET_DATABASE_URI"

echo "Target database details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"

# Retrieve and download the latest production backup
echo "Retrieving latest backup information..."
BACKUP_ID=$(clever --org "$CLEVER_ORG_ID" database backups "$CLEVER_DATABASE_ID" --format json | jq -r 'max_by(.creationDate) | .backupId')

if [ -z "$BACKUP_ID" ] || [ "$BACKUP_ID" = "null" ]; then
  echo "Error: Could not retrieve backup ID from Clever Cloud."
  exit 1
fi

BACKUP_DATE=$(clever --org "$CLEVER_ORG_ID" database backups "$CLEVER_DATABASE_ID" --format json | jq -r 'max_by(.creationDate) | .creationDate')
FILE="${BACKUP_DATE}.dump"

echo "Latest backup found:"
echo "  Backup ID: $BACKUP_ID"
echo "  Date: $BACKUP_DATE"
echo "  Output file: $FILE"

# Download the backup
echo "Downloading backup..."
clever --org "$CLEVER_ORG_ID" database backups download "$CLEVER_DATABASE_ID" "$BACKUP_ID" --output "$FILE"

if [ ! -f "$FILE" ]; then
  echo "Error: Backup file $FILE was not created."
  exit 1
fi

echo "Backup downloaded successfully: $(ls -lh "$FILE" | awk '{print $5}')"

# Restore the backup to the target database
echo "Starting database restoration..."
echo "WARNING: This will clean and replace all data in the target database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restoration cancelled."
  rm -f "$FILE"
  exit 0
fi

# Set password for pg_restore
export PGPASSWORD="$DB_PASSWORD"

echo "Restoring backup to target database..."
pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --no-owner \
  --no-privileges \
  --no-comments \
  --clean \
  --if-exists \
  --format=c \
  "$FILE"

RESTORE_EXIT_CODE=$?

# Clean up
echo "Cleaning up backup file..."
rm -f "$FILE"

if [ $RESTORE_EXIT_CODE -eq 0 ]; then
  echo "✅ Database restoration completed successfully!"
  echo "Target database: $DB_HOST:$DB_PORT/$DB_NAME"
else
  echo "❌ Database restoration failed with exit code: $RESTORE_EXIT_CODE"
  exit $RESTORE_EXIT_CODE
fi