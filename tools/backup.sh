#!/bin/bash
#
# backup.sh - Create a PostgreSQL backup compatible with restore.sh
#
# Usage:
#   ./tools/backup.sh <database_uri> [--jobs=N]
#   ./tools/backup.sh postgresql://user:pass@host:port/database
#   ./tools/backup.sh postgresql://user:pass@host:port/database --jobs=4
#
# Options:
#   --jobs=N    Use N parallel jobs (uses directory format, faster for large DBs)
#
# Output:
#   Without --jobs: Creates YYYY-MM-DDTHH:MM:SS.dump (custom format)
#   With --jobs:    Creates YYYY-MM-DDTHH:MM:SS.dump/ directory (directory format)
#   Both formats are compatible with: ./tools/restore.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
DATABASE_URI=""
PARALLEL_JOBS=0

for arg in "$@"; do
  case $arg in
    --jobs=*)
      PARALLEL_JOBS="${arg#*=}"
      ;;
    -*)
      echo -e "${RED}Error: Unknown option $arg${NC}"
      exit 1
      ;;
    *)
      DATABASE_URI="$arg"
      ;;
  esac
done

# Check arguments
if [ -z "$DATABASE_URI" ]; then
  echo -e "${RED}Error: Database URI required${NC}"
  echo ""
  echo "Usage: $0 <database_uri> [--jobs=N]"
  echo "Example: $0 postgresql://user:pass@host:port/database"
  echo "Example: $0 postgresql://user:pass@host:port/database --jobs=4"
  exit 1
fi

# Parse database URI
# Format: postgresql://user:password@host:port/database
if [[ "$DATABASE_URI" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
  DB_USER="${BASH_REMATCH[2]}"
  DB_PASSWORD="${BASH_REMATCH[3]}"
  DB_HOST="${BASH_REMATCH[4]}"
  DB_PORT="${BASH_REMATCH[5]}"
  DB_NAME="${BASH_REMATCH[6]}"
else
  echo -e "${RED}Error: Invalid database URI format${NC}"
  echo "Expected: postgresql://user:password@host:port/database"
  exit 1
fi

# Set password for psql/pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Detect server PostgreSQL major version
echo -e "${YELLOW}Detecting server PostgreSQL version...${NC}"
SERVER_VERSION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW server_version;" 2>/dev/null | xargs)
if [ -z "$SERVER_VERSION" ]; then
  echo -e "${RED}Error: Cannot connect to database to detect version${NC}"
  exit 1
fi
SERVER_MAJOR=$(echo "$SERVER_VERSION" | cut -d. -f1)
echo "Server PostgreSQL version: $SERVER_VERSION (major: $SERVER_MAJOR)"

# Find appropriate pg_dump
PG_DUMP=""

# Check common Homebrew locations for matching version
HOMEBREW_PG_PATHS=(
  "/opt/homebrew/opt/postgresql@${SERVER_MAJOR}/bin/pg_dump"
  "/usr/local/opt/postgresql@${SERVER_MAJOR}/bin/pg_dump"
  "/opt/homebrew/opt/libpq/bin/pg_dump"
  "/usr/local/opt/libpq/bin/pg_dump"
)

for pg_path in "${HOMEBREW_PG_PATHS[@]}"; do
  if [ -x "$pg_path" ]; then
    # Check if this pg_dump version is compatible
    PG_DUMP_VERSION=$("$pg_path" --version | grep -oE '[0-9]+' | head -1)
    if [ "$PG_DUMP_VERSION" -ge "$SERVER_MAJOR" ]; then
      PG_DUMP="$pg_path"
      echo -e "${GREEN}✓ Found compatible pg_dump: $pg_path (version $PG_DUMP_VERSION)${NC}"
      break
    fi
  fi
done

# Fallback to system pg_dump
if [ -z "$PG_DUMP" ]; then
  if command -v pg_dump &> /dev/null; then
    SYSTEM_PG_DUMP_VERSION=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
    if [ "$SYSTEM_PG_DUMP_VERSION" -ge "$SERVER_MAJOR" ]; then
      PG_DUMP="pg_dump"
      echo -e "${GREEN}✓ Using system pg_dump (version $SYSTEM_PG_DUMP_VERSION)${NC}"
    fi
  fi
fi

# Error if no compatible pg_dump found
if [ -z "$PG_DUMP" ]; then
  echo -e "${RED}Error: No compatible pg_dump found for PostgreSQL $SERVER_MAJOR${NC}"
  echo ""
  echo "Server requires pg_dump version >= $SERVER_MAJOR"
  echo ""
  echo "Install the correct version with Homebrew:"
  echo "  brew install postgresql@$SERVER_MAJOR"
  echo ""
  echo "Or add the correct version to your PATH:"
  echo "  export PATH=\"/opt/homebrew/opt/postgresql@$SERVER_MAJOR/bin:\$PATH\""
  exit 1
fi

# Generate filename with ISO 8601 timestamp (same convention as Clever Cloud backups)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine format based on parallel jobs
if [ "$PARALLEL_JOBS" -gt 0 ]; then
  OUTPUT_FORMAT="directory"
  OUTPUT_FILE="${TIMESTAMP}.dump"  # Directory name
  FORMAT_DISPLAY="directory (parallel: $PARALLEL_JOBS jobs)"
else
  OUTPUT_FORMAT="custom"
  OUTPUT_FILE="${TIMESTAMP}.dump"  # Single file
  FORMAT_DISPLAY="custom (single-threaded)"
fi

echo ""
echo "=========================================="
echo "PostgreSQL Backup"
echo "=========================================="
echo ""
echo "Source database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Output: $OUTPUT_FILE"
echo "Format: $FORMAT_DISPLAY"
echo ""

# Get database size
DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" | xargs)
echo "Database size: $DB_SIZE"
echo ""

# Start backup
echo -e "${YELLOW}Starting backup...${NC}"
START_TIME=$(date +%s)

if [ "$PARALLEL_JOBS" -gt 0 ]; then
  # Directory format with parallel jobs (lower memory, faster for large DBs)
  "$PG_DUMP" \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=directory \
    --jobs="$PARALLEL_JOBS" \
    --verbose \
    --no-owner \
    --no-privileges \
    --file="$OUTPUT_FILE" \
    2>&1 | grep -E "^pg_dump:" || true
else
  # Custom format (default, single file)
  "$PG_DUMP" \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --verbose \
    --no-owner \
    --no-privileges \
    --file="$OUTPUT_FILE" \
    2>&1 | grep -E "^pg_dump:" || true
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Check if backup was created (file or directory)
if [ -f "$OUTPUT_FILE" ] || [ -d "$OUTPUT_FILE" ]; then
  if [ -d "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -sh "$OUTPUT_FILE" | cut -f1)
  else
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
  fi
  echo ""
  echo -e "${GREEN}=========================================="
  echo "Backup completed successfully!"
  echo "==========================================${NC}"
  echo ""
  echo "Output: $OUTPUT_FILE"
  echo "Size: $FILE_SIZE"
  echo "Duration: ${DURATION}s"
  echo ""
  echo "To restore this backup:"
  echo "  export TARGET_DATABASE_URI=\"postgresql://user:pass@host:port/db\""
  echo "  ./tools/restore.sh $OUTPUT_FILE"
else
  echo -e "${RED}Error: Backup was not created${NC}"
  exit 1
fi
