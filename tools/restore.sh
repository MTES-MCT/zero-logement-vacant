#!/usr/bin/env bash

# PostgreSQL backup restoration script
# Restores a backup from Clever Cloud to a target database specified by URI
# Supports resumable restores using 3-phase approach (pre-data, data, post-data)

set -e

# Configuration
MAX_RETRIES=3
RETRY_DELAY=10  # seconds
PARALLEL_JOBS=2  # Reduce if memory is limited
PROGRESS_FILE=".restore_progress"

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

# Check PostgreSQL server health before restore
check_pg_connection() {
  export PGPASSWORD="$DB_PASSWORD"
  if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Error: Cannot connect to PostgreSQL server."
    return 1
  fi
  echo "✓ PostgreSQL connection OK"
  return 0
}

# Check available disk space on target (Docker or local)
check_resources() {
  echo "Checking target database resources..."
  export PGPASSWORD="$DB_PASSWORD"

  # Get database size
  DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | xargs)
  echo "  Current database size: $DB_SIZE"

  # Check if Docker container (for local restore)
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
    CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
    echo "  Docker container detected: $CONTAINER"

    # Check Docker container memory
    DOCKER_MEM=$(docker stats --no-stream --format "{{.MemUsage}}" "$CONTAINER" 2>/dev/null || echo "N/A")
    echo "  Docker memory usage: $DOCKER_MEM"
  fi

  return 0
}

# Save progress to file
save_progress() {
  local phase="$1"
  local dump_file="$2"
  echo "PHASE=$phase" > "$PROGRESS_FILE"
  echo "DUMP_FILE=$dump_file" >> "$PROGRESS_FILE"
  echo "TIMESTAMP=$(date -Iseconds)" >> "$PROGRESS_FILE"
}

# Extract expected table row counts from dump file
extract_expected_counts() {
  local dump_file="$1"
  local counts_file="${dump_file}.expected_counts"

  if [ -f "$counts_file" ]; then
    echo "Using cached expected counts from: $counts_file"
    return 0
  fi

  echo "Extracting expected row counts from dump file..."
  # pg_restore --list shows the TOC with row counts for TABLE DATA entries
  pg_restore --list "$dump_file" 2>/dev/null | \
    grep "TABLE DATA" | \
    awk '{
      # Format: ID; TYPE SCHEMA TABLE OWNER
      # Example: 3456; 0 0 TABLE DATA public users postgres
      gsub(/;/, "", $1);
      schema = $(NF-2);
      table = $(NF-1);
      print schema "." table
    }' | sort > "$counts_file"

  echo "Found $(wc -l < "$counts_file" | xargs) tables in dump"
}

# Verify data integrity after restore
verify_data_integrity() {
  local dump_file="$1"
  local counts_file="${dump_file}.expected_counts"

  echo ""
  echo "Verifying data integrity..."

  if [ ! -f "$counts_file" ]; then
    echo "⚠️  No expected counts file found, skipping verification"
    return 0
  fi

  # Get list of tables from dump
  local expected_tables=$(cat "$counts_file")
  local missing_tables=0
  local empty_tables=0
  local verified_tables=0

  # Check each expected table exists and has data
  while IFS= read -r table; do
    if [ -z "$table" ]; then continue; fi

    # Query table existence and row count
    local result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema || '.' || table_name = '$table')
        THEN (SELECT COUNT(*) FROM $table)
        ELSE -1
      END;" 2>/dev/null | xargs)

    if [ "$result" = "-1" ]; then
      echo "  ❌ Missing table: $table"
      missing_tables=$((missing_tables + 1))
    elif [ "$result" = "0" ]; then
      # Some tables might legitimately be empty, just warn
      empty_tables=$((empty_tables + 1))
    else
      verified_tables=$((verified_tables + 1))
    fi
  done <<< "$expected_tables"

  echo ""
  echo "Verification results:"
  echo "  ✓ Tables with data: $verified_tables"
  echo "  ⚠️  Empty tables: $empty_tables"
  echo "  ❌ Missing tables: $missing_tables"

  if [ $missing_tables -gt 0 ]; then
    echo ""
    echo "❌ Data verification FAILED - $missing_tables tables are missing!"
    return 1
  fi

  echo "✓ Data verification passed"
  return 0
}

# Quick sanity check on critical tables
verify_critical_tables() {
  echo ""
  echo "Checking critical tables..."

  local critical_tables=(
    "public.users"
    "public.establishments"
    "public.campaigns"
    "public.owners"
    "public.fast_housing"
  )

  local all_ok=true

  for table in "${critical_tables[@]}"; do
    local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)

    if [ -z "$count" ] || [ "$count" = "" ]; then
      echo "  ❌ $table: ERROR (table missing?)"
      all_ok=false
    elif [ "$count" = "0" ]; then
      echo "  ⚠️  $table: 0 rows (might be normal)"
    else
      echo "  ✓ $table: $count rows"
    fi
  done

  if [ "$all_ok" = false ]; then
    return 1
  fi
  return 0
}

# Load progress from file
load_progress() {
  if [ -f "$PROGRESS_FILE" ]; then
    source "$PROGRESS_FILE"
    echo "Found previous restore progress:"
    echo "  Phase: $PHASE"
    echo "  Dump file: $DUMP_FILE"
    echo "  Timestamp: $TIMESTAMP"
    return 0
  fi
  return 1
}

# Clear progress file
clear_progress() {
  rm -f "$PROGRESS_FILE"
}

# Restart Docker container if needed
restart_docker_if_needed() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
    CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
    echo "Restarting Docker container: $CONTAINER"
    docker restart "$CONTAINER"
    sleep 10
    check_pg_connection
  fi
}

# Perform restore for a specific section with retry logic
restore_section() {
  local section="$1"
  local dump_file="$2"
  local attempt=0
  local success=false

  echo ""
  echo "=========================================="
  echo "Restoring section: $section"
  echo "=========================================="

  while [ $attempt -lt $MAX_RETRIES ] && [ "$success" = false ]; do
    attempt=$((attempt + 1))
    echo ""
    echo "--- Attempt $attempt of $MAX_RETRIES for section: $section ---"

    # Check connection before attempting restore
    if ! check_pg_connection; then
      echo "PostgreSQL server is not responding. Attempting restart..."
      restart_docker_if_needed
      sleep $RETRY_DELAY
      continue
    fi

    # Build pg_restore command based on section
    local pg_restore_cmd="pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    pg_restore_cmd="$pg_restore_cmd --verbose --no-owner --no-privileges --no-comments"
    pg_restore_cmd="$pg_restore_cmd --format=c --section=$section"

    # Add section-specific options
    case "$section" in
      "pre-data")
        pg_restore_cmd="$pg_restore_cmd --clean --if-exists"
        ;;
      "data")
        # Disable triggers during data load for better performance
        pg_restore_cmd="$pg_restore_cmd --disable-triggers --jobs=$PARALLEL_JOBS"
        ;;
      "post-data")
        # Post-data includes indexes and constraints
        pg_restore_cmd="$pg_restore_cmd --jobs=$PARALLEL_JOBS"
        ;;
    esac

    # Run pg_restore
    if $pg_restore_cmd "$dump_file" 2>&1 | tee "restore_${section}_attempt_${attempt}.log"; then
      success=true
      echo "✓ Section $section completed successfully"
      save_progress "$section" "$dump_file"
      rm -f "restore_${section}_attempt_${attempt}.log"
    else
      local exit_code=${PIPESTATUS[0]}
      echo ""
      echo "⚠️  Section $section failed with exit code: $exit_code"

      # Check for specific errors
      if grep -q "server closed the connection" "restore_${section}_attempt_${attempt}.log" 2>/dev/null; then
        echo ""
        echo "⚠️  Server connection was lost. This could indicate:"
        echo "   - Out of memory (increase Docker memory limit)"
        echo "   - PostgreSQL crashed (check Docker logs)"
        echo ""
        restart_docker_if_needed
      fi

      if [ $attempt -lt $MAX_RETRIES ]; then
        echo "Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
      fi
    fi
  done

  if [ "$success" = false ]; then
    echo "❌ Section $section failed after $MAX_RETRIES attempts"
    return 1
  fi

  return 0
}

# Main script starts here
echo "=========================================="
echo "PostgreSQL Backup Restoration Script"
echo "=========================================="
echo ""

# Parse the target database URI
echo "Parsing target database URI..."
parse_database_uri "$TARGET_DATABASE_URI"

echo "Target database details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Verify connection and check resources before proceeding
check_pg_connection || exit 1
check_resources

# Check for previous progress
RESUME_MODE=false
START_PHASE="pre-data"

if load_progress; then
  echo ""
  read -p "Resume from previous restore? (Y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    RESUME_MODE=true
    FILE="$DUMP_FILE"
    case "$PHASE" in
      "pre-data")
        START_PHASE="data"
        ;;
      "data")
        START_PHASE="post-data"
        ;;
      "post-data")
        echo "Previous restore was complete. Starting fresh."
        RESUME_MODE=false
        clear_progress
        ;;
    esac
    echo "Resuming from phase: $START_PHASE"
  else
    clear_progress
  fi
fi

# Download backup if not resuming
if [ "$RESUME_MODE" = false ]; then
  # Retrieve and download the latest production backup
  echo ""
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

  # Check if dump file already exists
  if [ -f "$FILE" ]; then
    echo ""
    echo "Dump file already exists: $FILE ($(ls -lh "$FILE" | awk '{print $5}'))"
    read -p "Use existing file? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
      echo "Downloading backup..."
      clever --org "$CLEVER_ORG_ID" database backups download "$CLEVER_DATABASE_ID" "$BACKUP_ID" --output "$FILE"
    fi
  else
    echo "Downloading backup..."
    clever --org "$CLEVER_ORG_ID" database backups download "$CLEVER_DATABASE_ID" "$BACKUP_ID" --output "$FILE"
  fi

  if [ ! -f "$FILE" ]; then
    echo "Error: Backup file $FILE was not created."
    exit 1
  fi

  echo "Backup ready: $(ls -lh "$FILE" | awk '{print $5}')"
fi

# Extract expected table list from dump (for verification later)
extract_expected_counts "$FILE"

# Confirmation
echo ""
echo "Starting database restoration..."
echo "WARNING: This will clean and replace all data in the target database!"
echo ""
echo "Restore will proceed in 3 phases:"
echo "  1. pre-data  - Schema, extensions, functions"
echo "  2. data      - Table data (parallel, triggers disabled)"
echo "  3. post-data - Indexes, constraints, triggers"
echo ""

if [ "$RESUME_MODE" = true ]; then
  echo "⚠️  RESUME MODE: Starting from phase '$START_PHASE'"
  echo ""
fi

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restoration cancelled."
  exit 0
fi

# Set password for pg_restore
export PGPASSWORD="$DB_PASSWORD"

# Track overall success
RESTORE_SUCCESS=true

# Phase 1: Pre-data (schema, extensions, functions)
if [ "$START_PHASE" = "pre-data" ]; then
  if ! restore_section "pre-data" "$FILE"; then
    RESTORE_SUCCESS=false
    echo ""
    echo "❌ Restore failed at phase: pre-data"
    echo "To resume, run this script again - it will offer to resume."
    exit 1
  fi
  START_PHASE="data"
fi

# Phase 2: Data (parallel, triggers disabled)
if [ "$START_PHASE" = "data" ]; then
  if ! restore_section "data" "$FILE"; then
    RESTORE_SUCCESS=false
    echo ""
    echo "❌ Restore failed at phase: data"
    echo "To resume, run this script again - it will offer to resume."
    exit 1
  fi

  # Verify data was loaded correctly before moving to post-data
  echo ""
  echo "Verifying data phase completed successfully..."
  if ! verify_critical_tables; then
    echo ""
    echo "❌ Data verification failed! Some critical tables are missing."
    echo "The 'data' phase will need to be re-run."
    echo ""
    # Don't save progress - force re-run of data phase
    rm -f "$PROGRESS_FILE"
    save_progress "pre-data" "$FILE"
    exit 1
  fi

  START_PHASE="post-data"
fi

# Phase 3: Post-data (indexes, constraints)
if [ "$START_PHASE" = "post-data" ]; then
  if ! restore_section "post-data" "$FILE"; then
    RESTORE_SUCCESS=false
    echo ""
    echo "❌ Restore failed at phase: post-data"
    echo "To resume, run this script again - it will offer to resume."
    exit 1
  fi
fi

# Clean up on success
if [ "$RESTORE_SUCCESS" = true ]; then
  echo ""
  echo "=========================================="
  echo "Final verification"
  echo "=========================================="

  # Run full verification
  verify_critical_tables
  verify_data_integrity "$FILE"

  echo ""
  echo "=========================================="
  echo "✅ Database restoration completed successfully!"
  echo "=========================================="
  echo "Target database: $DB_HOST:$DB_PORT/$DB_NAME"
  echo ""

  # Ask about cleanup
  read -p "Delete dump file and progress file? (Y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    rm -f "$FILE"
    rm -f "${FILE}.expected_counts"
    clear_progress
    rm -f restore_*.log
    echo "Cleanup complete."
  else
    echo "Files kept: $FILE, $PROGRESS_FILE"
  fi
fi
