# Database Operations Runbook

> PostgreSQL operations for Zero Logement Vacant

---

## 1. Connection Information

### Production

```bash
# Get connection string from Clever Cloud
clever env | grep POSTGRESQL

# Connect via psql
psql $POSTGRESQL_ADDON_URI

# Or with explicit params
psql -h <host> -p <port> -U <user> -d <database>
```

### Local Development

```bash
# Default local connection
psql postgres://postgres:postgres@localhost:5432/zlv

# Via Docker
docker exec -it zlv-postgres psql -U postgres -d zlv
```

---

## 2. Backup & Restore

### Automated Backups (Clever Cloud)

- **Frequency:** Daily
- **Retention:** 30 days
- **Location:** Clever Cloud dashboard → Add-on → Backups

### Manual Backup

```bash
# Full database dump
pg_dump $POSTGRESQL_ADDON_URI > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump $POSTGRESQL_ADDON_URI | gzip > backup_$(date +%Y%m%d).sql.gz

# Specific tables only
pg_dump $POSTGRESQL_ADDON_URI -t housing -t owners > housing_owners_backup.sql
```

### Restore

```bash
# From SQL file
psql $POSTGRESQL_ADDON_URI < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql $POSTGRESQL_ADDON_URI

# Restore specific table (drop existing first)
psql $POSTGRESQL_ADDON_URI -c "TRUNCATE TABLE housing CASCADE;"
pg_restore -t housing backup.dump
```

---

## 3. Migrations

### Run Migrations

```bash
# Production (via deployment)
# Migrations run automatically on deploy

# Manual execution
yarn workspace @zerologementvacant/server migrate

# With explicit DATABASE_URL
DATABASE_URL=$POSTGRESQL_ADDON_URI yarn workspace @zerologementvacant/server migrate
```

### Check Migration Status

```bash
# List applied migrations
yarn workspace @zerologementvacant/server migrate:status

# Via SQL
SELECT * FROM knex_migrations ORDER BY id DESC LIMIT 10;
```

### Rollback Migration

```bash
# Rollback last migration
yarn workspace @zerologementvacant/server migrate:rollback

# Rollback all
yarn workspace @zerologementvacant/server migrate:rollback --all
```

### Create New Migration

```bash
yarn workspace @zerologementvacant/server migrate:make <migration_name>
# Creates: server/src/infra/database/migrations/YYYYMMDDHHMMSS_migration_name.ts
```

---

## 4. Common Queries

### Health Check

```sql
-- Connection count
SELECT count(*) as total_connections,
       count(*) FILTER (WHERE state = 'active') as active,
       count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;

-- Table sizes
SELECT relname as table,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- Index usage
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 10;
```

### Data Statistics

```sql
-- Housing counts by status
SELECT status, count(*)
FROM fast_housing
WHERE deleted_at IS NULL
GROUP BY status;

-- Users by establishment
SELECT e.name, count(u.id) as user_count
FROM establishments e
LEFT JOIN users u ON u.establishment_id = e.id AND u.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.name
ORDER BY user_count DESC
LIMIT 20;

-- Recent events
SELECT type, count(*), max(created_at) as last_event
FROM events
WHERE created_at > now() - interval '24 hours'
GROUP BY type
ORDER BY count DESC;
```

### Performance Analysis

```sql
-- Slow queries (requires pg_stat_statements)
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Missing indexes (sequential scans on large tables)
SELECT relname, seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch,
       seq_tup_read / NULLIF(seq_scan, 0) as avg_seq_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;

-- Lock monitoring
SELECT relation::regclass, mode, granted, pid
FROM pg_locks
WHERE NOT granted;
```

---

## 5. Maintenance Operations

### Vacuum & Analyze

```sql
-- Analyze all tables (update statistics)
ANALYZE;

-- Vacuum specific table (reclaim space)
VACUUM ANALYZE fast_housing;

-- Full vacuum (locks table, use with caution)
VACUUM FULL fast_housing;
```

### Reindex

```sql
-- Reindex specific table
REINDEX TABLE fast_housing;

-- Reindex specific index
REINDEX INDEX idx_housing_insee_code;

-- Concurrent reindex (no locks, PostgreSQL 12+)
REINDEX TABLE CONCURRENTLY fast_housing;
```

### Kill Long-Running Queries

```sql
-- Find long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
AND now() - pg_stat_activity.query_start > interval '5 minutes';

-- Terminate specific query
SELECT pg_terminate_backend(<pid>);

-- Cancel (softer than terminate)
SELECT pg_cancel_backend(<pid>);
```

---

## 6. Data Fixes

### Soft Delete Recovery

```sql
-- Find recently deleted records
SELECT id, deleted_at
FROM housing
WHERE deleted_at > now() - interval '24 hours';

-- Restore soft-deleted record
UPDATE housing SET deleted_at = NULL WHERE id = '<uuid>';
```

### Fix Orphaned Records

```sql
-- Find owners without housing
SELECT o.id, o.full_name
FROM owners o
LEFT JOIN owners_housing oh ON oh.owner_id = o.id
WHERE oh.owner_id IS NULL
AND o.deleted_at IS NULL;

-- Find housing without owners
SELECT h.id, h.raw_address
FROM fast_housing h
LEFT JOIN owners_housing oh ON oh.housing_id = h.id
WHERE oh.housing_id IS NULL
AND h.deleted_at IS NULL;
```

### Bulk Updates

```sql
-- Update with safety (use transaction)
BEGIN;

UPDATE fast_housing
SET status = 'Vacant'
WHERE status IS NULL
AND deleted_at IS NULL;

-- Verify changes
SELECT count(*) FROM fast_housing WHERE status = 'Vacant';

-- If OK
COMMIT;
-- If not OK
ROLLBACK;
```

---

## 7. Schema Operations

### Add Column (Safe)

```sql
-- Add nullable column (no lock)
ALTER TABLE housing ADD COLUMN new_field VARCHAR(255);

-- Add with default (locks in PG < 11)
ALTER TABLE housing ADD COLUMN new_field VARCHAR(255) DEFAULT 'value';
```

### Create Index (Safe)

```sql
-- Concurrent index creation (no locks)
CREATE INDEX CONCURRENTLY idx_housing_new_field ON fast_housing(new_field);

-- Check index creation progress
SELECT * FROM pg_stat_progress_create_index;
```

### Rename Column

```sql
-- Rename (instant, no lock)
ALTER TABLE housing RENAME COLUMN old_name TO new_name;
```

---

## 8. Emergency Procedures

### Database Full

```bash
# Check disk usage
SELECT pg_size_pretty(pg_database_size(current_database()));

# Find largest tables
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 5;

# Truncate logs/temp tables if safe
TRUNCATE TABLE temp_import_data;

# Vacuum to reclaim space
VACUUM FULL;
```

### Restore from Backup

1. Go to Clever Cloud dashboard
2. Select PostgreSQL add-on
3. Go to "Backups" tab
4. Click "Restore" on desired backup
5. **Warning:** This replaces all current data

### Point-in-Time Recovery

Contact Clever Cloud support for PITR requests.

---

## 9. Connection Pooling

### Current Configuration (Knex)

```typescript
// server/src/infra/database/index.ts
pool: {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000
}
```

### Monitor Pool Usage

```sql
-- Active connections by application
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name;

-- Connection states
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
```

---

## 10. Quick Reference

```bash
# Connect
psql $POSTGRESQL_ADDON_URI

# Backup
pg_dump $POSTGRESQL_ADDON_URI > backup.sql

# Restore
psql $POSTGRESQL_ADDON_URI < backup.sql

# Migrations
yarn workspace @zerologementvacant/server migrate
yarn workspace @zerologementvacant/server migrate:rollback
yarn workspace @zerologementvacant/server migrate:status
```

```sql
-- Useful shortcuts in psql
\dt          -- List tables
\di          -- List indexes
\d+ table    -- Describe table with details
\x           -- Toggle expanded output
\timing      -- Toggle query timing
\q           -- Quit
```
