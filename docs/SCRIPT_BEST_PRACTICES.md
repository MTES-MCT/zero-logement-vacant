# Best Practices for Python Data Processing Scripts

This document compiles patterns and optimizations to apply for large-scale data processing scripts (imports, migrations, calculations).

## 📋 Table of Contents

1. [General Architecture](#general-architecture)
2. [Database Management](#database-management)
3. [Parallelization](#parallelization)
4. [Logging](#logging)
5. [Recovery and Resilience](#recovery-and-resilience)
6. [User Interface](#user-interface)
7. [Code Examples](#code-examples)

---

## General Architecture

### Recommended Class Structure

```python
class DataProcessor:
    def __init__(self, db_url: str, dry_run: bool = False,
                 batch_size: int = 5000, num_workers: int = 4):
        """
        Args:
            db_url: PostgreSQL connection string
            dry_run: Simulation mode (no DB modifications)
            batch_size: Batch size for SQL operations
            num_workers: Number of parallel workers
        """
        self.db_url = db_url
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.num_workers = num_workers
        self.conn = None
        self.cursor = None

        # Thread-safe statistics
        self.stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0
        }
        self.stats_lock = threading.Lock()

    def run(self, limit: int = None):
        """Main entry point"""
        self.connect()
        try:
            # Process in batches
            self.process_in_batches(limit)
        finally:
            self.disconnect()
```

### Standard CLI Arguments

```python
parser = argparse.ArgumentParser(description='Process data')

# Essential
parser.add_argument('--db-url', required=True, help='Database URL')
parser.add_argument('--dry-run', action='store_true', help='Simulation mode')
parser.add_argument('--limit', type=int, help='Limit records to process')

# Optimizations
parser.add_argument('--batch-size', type=int, default=5000,
                   help='Batch size (default: 5000)')
parser.add_argument('--num-workers', type=int, default=4,
                   help='Parallel workers (default: 4)')

# Debug
parser.add_argument('--debug', action='store_true', help='Enable debug logs')
parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
```

---

## Database Management

### SQL Indexes to Optimize Performance

**IMPORTANT**: When creating a script that performs intensive queries, always create appropriate SQL indexes in a dedicated Knex migration.

#### Recommended Workflow

1. **Identify critical queries** in the script
2. **Analyze WHERE, JOIN, and ORDER BY clauses**
3. **Create a Knex migration** with necessary indexes
4. **Document indexes** in the Python script

#### Example: Knex Migration for Indexes

```typescript
// migrations/20241028_add_indexes_for_distance_calculation.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Index for owner addresses lookup (batch_get_address_data)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_ban_addresses_owner_lookup
    ON ban_addresses(ref_id, address_kind)
    INCLUDE (postal_code, address, latitude, longitude)
    WHERE address_kind = 'Owner' AND postal_code IS NOT NULL
  `);

  // Index for housing addresses lookup (batch_get_address_data)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_ban_addresses_housing_lookup
    ON ban_addresses(ref_id, address_kind)
    INCLUDE (postal_code, address, latitude, longitude)
    WHERE address_kind = 'Housing' AND postal_code IS NOT NULL
  `);

  // Index for update operations (update_database)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_owners_housing_update
    ON owners_housing(owner_id, housing_id)
  `);

  // Partial index for filtering unprocessed pairs (get_all_owner_housing_pairs)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_owners_housing_distances
    ON owners_housing(owner_id, housing_id)
    WHERE locprop_distance_ban IS NULL OR locprop_relative_ban IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_ban_addresses_owner_lookup');
  await knex.raw('DROP INDEX IF EXISTS idx_ban_addresses_housing_lookup');
  await knex.raw('DROP INDEX IF EXISTS idx_owners_housing_update');
  await knex.raw('DROP INDEX IF EXISTS idx_owners_housing_distances');
}
```

#### Index Types by Use Case

| Use Case | Index Type | Example |
|----------|------------|---------|
| **Composite key lookup** | Composite index | `(ref_id, address_kind)` |
| **With additional columns** | INCLUDE clause | `INCLUDE (postal_code, address, ...)` |
| **Subset filtering** | Partial index (WHERE) | `WHERE address_kind = 'Owner'` |
| **JOIN between tables** | Index on FKs | `(owner_id, housing_id)` |
| **ANY() queries** | Index on column | `(ref_id)` or `(ref_id, type)` |
| **NULL filters** | Partial index | `WHERE field IS NULL` |

#### Documentation in Python Script

**Always document** required indexes in the script's docstring:

```python
#!/usr/bin/env python3
"""
Calculate distances between owners and their housing properties.

REQUIRED INDEXES:
This script requires the following PostgreSQL indexes for optimal performance.
These should be created via Knex migration before running the script.

- idx_ban_addresses_owner_lookup: Speeds up owner address lookups
- idx_ban_addresses_housing_lookup: Speeds up housing address lookups
- idx_owners_housing_update: Optimizes bulk updates
- idx_owners_housing_distances: Filters unprocessed pairs efficiently

Migration file: migrations/20241028_add_indexes_for_distance_calculation.ts

PERFORMANCE:
- Without indexes: Hours to days
- With indexes: Minutes to hours (10-100x faster)

Usage:
    python calculate_distances.py --db-url <url>
"""
```

#### Checking for Missing Indexes

Add a check at the beginning of the script to warn if indexes are missing:

```python
def check_required_indexes(self):
    """Check if required indexes exist and warn if missing."""
    required_indexes = [
        'idx_ban_addresses_owner_lookup',
        'idx_ban_addresses_housing_lookup',
        'idx_owners_housing_update',
        'idx_owners_housing_distances'
    ]

    self.cursor.execute("""
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY(%s)
    """, (required_indexes,))

    existing = {row['indexname'] for row in self.cursor.fetchall()}
    missing = set(required_indexes) - existing

    if missing:
        print("⚠️  WARNING: Missing recommended indexes:")
        for idx in missing:
            print(f"   - {idx}")
        print("   Performance may be significantly degraded.")
        print("   Run the migration: yarn knex migrate:latest")
        print()

def run(self, limit: int = None):
    """Main execution method."""
    self.connect()

    # Check indexes
    self.check_required_indexes()

    try:
        # ... rest of the script
        pass
```

#### Priority Order for Creating Indexes

1. **Indexes on JOIN columns** → Immediate impact on most expensive queries
2. **Indexes on frequent WHERE columns** → Reduces table scans
3. **Partial indexes** → Optimizes specific filters (IS NULL, etc.)
4. **INCLUDE columns** → Avoids additional lookups (index-only scans)

#### Index Maintenance

```sql
-- Check index sizes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Rebuild fragmented index
REINDEX INDEX CONCURRENTLY idx_name;
```

### ✅ Best Practices

#### 1. **Batch Processing - Avoid Individual Queries**

❌ **BAD**: Individual queries
```python
for item in items:
    cursor.execute("UPDATE table SET field = %s WHERE id = %s",
                  (item.value, item.id))
    conn.commit()  # One commit per line = VERY SLOW
```

✅ **GOOD**: Batch updates with `execute_values`
```python
from psycopg2.extras import execute_values

# Prepare all data
update_data = [(item.value, item.id) for item in items]

# Single query for entire batch
execute_values(
    cursor,
    """
    UPDATE table AS t
    SET field = data.value
    FROM (VALUES %s) AS data(value, id)
    WHERE t.id = data.id
    """,
    update_data,
    page_size=1000
)
conn.commit()  # Single commit for entire batch
```

#### 2. **Batch Fetching - Load Data in Batches**

❌ **BAD**: Load all data at once
```python
# Loads 10M rows in memory = OOM
cursor.execute("SELECT * FROM huge_table")
all_rows = cursor.fetchall()
```

✅ **GOOD**: Process in chunks
```python
# Process in batches of 50k
batch_size = 50000
offset = 0

while True:
    cursor.execute("""
        SELECT * FROM huge_table
        ORDER BY id
        LIMIT %s OFFSET %s
    """, (batch_size, offset))

    batch = cursor.fetchall()
    if not batch:
        break

    process_batch(batch)
    offset += batch_size
```

#### 3. **Batch Loading with ANY() for Lookups**

❌ **BAD**: Individual queries in loop
```python
for id in ids:
    cursor.execute("SELECT * FROM table WHERE id = %s", (id,))
    result = cursor.fetchone()
```

✅ **GOOD**: Single query with ANY()
```python
cursor.execute("""
    SELECT * FROM table
    WHERE id = ANY(%s)
""", (ids,))  # ids is a Python list

results = {row['id']: row for row in cursor.fetchall()}
```

#### 4. **Handling NULL/NaN/Infinity Values**

```python
import math

def prepare_value(value):
    """Clean values before insertion"""
    if value is None:
        return None
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value

# In SQL query
"""
UPDATE table
SET field = CASE
    WHEN data.value IS NULL THEN NULL
    ELSE data.value::integer
END
FROM (VALUES %s) AS data(value, id)
WHERE table.id = data.id
"""
```

#### 5. **Automatic Recovery - Skip Already Processed Records**

✅ **GOOD**: Filter already processed data
```python
# Load ONLY unprocessed data
cursor.execute("""
    SELECT * FROM source_table
    WHERE processed_flag IS NULL
       OR processed_at IS NULL
    ORDER BY id
    LIMIT %s
""", (batch_size,))
```

---

## Parallelization

### Pattern: Parallel Batch Updates

```python
def _update_batch_worker(self, batch_data: tuple) -> tuple:
    """Worker to process a batch in parallel"""
    batch_id, batch, db_url = batch_data

    conn = None
    try:
        # Each worker creates its own connection
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ✅ OPTIMIZATION: Faster asynchronous commits
        cursor.execute("SET synchronous_commit = off")

        # Prepare data
        update_data = prepare_updates(batch)

        # Execute update
        execute_values(cursor, UPDATE_QUERY, update_data, page_size=1000)

        # ✅ Independent commit per batch
        conn.commit()
        cursor.close()
        conn.close()

        return (batch_id, len(batch), None)

    except Exception as e:
        if conn:
            try:
                conn.rollback()
                conn.close()
            except:
                pass
        return (batch_id, 0, str(e))

def update_database_parallel(self, updates: List, num_workers: int = 4):
    """Update DB in parallel with multiple workers"""
    batch_size = 5000

    # Split into batches
    batches = []
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i + batch_size]
        batches.append((i // batch_size, batch, self.db_url))

    # Process in parallel
    from concurrent.futures import ThreadPoolExecutor, as_completed

    with tqdm(total=len(updates), desc="Saving", unit="rec") as pbar:
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = {
                executor.submit(self._update_batch_worker, batch_data): batch_data
                for batch_data in batches
            }

            for future in as_completed(futures):
                batch_id, count, error = future.result()
                if error:
                    logging.error(f"Batch {batch_id} failed: {error}")
                pbar.update(count if count > 0 else len(batches[batch_id][1]))
```

### Parallelization Recommendations

| Use Case | num_workers | Reason |
|----------|-------------|--------|
| Slow network / Remote DB | 2-4 | Limit network contention |
| Fast local DB (SSD) | 4-8 | Maximize throughput |
| CPU intensive calculations | cpu_count() | Use all CPUs |
| I/O intensive (external APIs) | 10-20 | Mask latency |

**Note**: By default, use **6 workers** for bulk DB updates (good performance/resource compromise).

### Verifying Parallelism

To confirm workers are truly executing in parallel:

```python
import time
import threading

def _update_batch_worker(self, batch_data: tuple) -> tuple:
    batch_id, batch, db_url = batch_data
    start_time = time.time()
    thread_id = threading.current_thread().name

    conn = None
    try:
        # Time each operation
        conn_start = time.time()
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SET synchronous_commit = off")
        conn_time = time.time() - conn_start

        prep_start = time.time()
        update_data = prepare_data(batch)
        prep_time = time.time() - prep_start

        exec_start = time.time()
        execute_values(cursor, UPDATE_QUERY, update_data, page_size=1000)
        exec_time = time.time() - exec_start

        commit_start = time.time()
        conn.commit()
        commit_time = time.time() - commit_start

        cursor.close()
        conn.close()

        total_time = time.time() - start_time

        # Log to verify parallelism (first batches only)
        if batch_id < 20:
            logging.info(
                f"[{thread_id}] Batch #{batch_id+1}: {len(batch)} records in {total_time:.2f}s "
                f"(conn:{conn_time:.2f}s prep:{prep_time:.2f}s exec:{exec_time:.2f}s "
                f"commit:{commit_time:.2f}s) ✓ Independent commit completed"
            )

        return (batch_id, len(batch), None)

    except Exception as e:
        # Error handling...
        pass
```

**What to observe**:
- Multiple different threads (ThreadPoolExecutor-0_0, ThreadPoolExecutor-0_1, etc.)
- Interleaved logs (batch #3 may finish before batch #2)
- Overlapping timestamps
- Fast commit times with `synchronous_commit = off` (~0.1-1s instead of 3-10s)

---

## Logging

### Simple and Effective Configuration

```python
def setup_logging(verbose: bool = False, debug: bool = False):
    """Configure simplified logging"""
    logger = logging.getLogger(__name__)

    # Level according to options
    if debug:
        level = logging.DEBUG
    elif verbose:
        level = logging.INFO
    else:
        level = logging.WARNING

    logger.setLevel(level)

    # Clear existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Log file (always INFO)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f'script_{timestamp}.log'
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.INFO)

    # Console (WARNING by default, adjustable)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)

    # Simple format
    formatter = logging.Formatter('%(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
```

### Logging Levels

```python
# WARNING: Console by default (important errors only)
logger.warning("⚠️ Warning: 1000 records skipped")
logger.error("❌ Failed to connect to database")

# INFO: Log file (progress, stats)
logger.info(f"✅ Processed {count} records")
logger.info(f"📊 Success rate: {rate:.1f}%")

# DEBUG: Only if --debug (technical details)
logger.debug(f"Query: {query}")
logger.debug(f"Batch size: {len(batch)}")
```

---

## Recovery and Resilience

### Pattern: Skip Already Processed

```python
def get_items_to_process(self, limit: int = None) -> List:
    """Retrieve only unprocessed items"""
    query = """
    SELECT * FROM items
    WHERE processed_at IS NULL
       OR status IS NULL
    ORDER BY id
    """

    if limit:
        query += f" LIMIT {limit}"

    self.cursor.execute(query)
    return self.cursor.fetchall()
```

### Pattern: Resume from Last Batch

```python
def process_in_batches(self, limit: int = None):
    """Process in batches with automatic recovery"""
    all_items = self.get_items_to_process(limit)
    batch_size = 50000

    for batch_idx in range(0, len(all_items), batch_size):
        batch = all_items[batch_idx:batch_idx + batch_size]

        # Check if batch is already processed (sampling)
        sample_size = min(10, len(batch))
        sample = batch[:sample_size]

        already_processed = sum(1 for item in sample if item['status'] is not None)

        # If >80% of sample is processed, skip entire batch
        if already_processed > sample_size * 0.8:
            print(f"⏭️ Skipping batch {batch_idx//batch_size + 1} (already processed)")
            continue

        # Otherwise, process batch
        self.process_batch(batch)
```

### Pattern: Commit per Batch (Independent)

```python
# ✅ GOOD: Regular commits = minimal loss if crash
for batch in batches:
    process_batch(batch)
    conn.commit()  # Commit after each batch
    # If crash here, everything before is saved

# ❌ BAD: Single commit at end = everything lost if crash
for batch in batches:
    process_batch(batch)
conn.commit()  # If crash before, EVERYTHING is lost
```

### Pattern: Optimized Parallel Commits

**Important**: In parallel processing, each worker must do its own commit independently.

```python
def _update_batch_worker(self, batch_data: tuple) -> tuple:
    """Worker that does its own commit"""
    batch_id, batch, db_url = batch_data

    conn = None
    try:
        # Dedicated connection for this worker
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ✅ OPTIMIZATION: Disable synchronous_commit
        # Speeds up commits 2-5x without compromising durability
        # (data is still written, just asynchronously)
        cursor.execute("SET synchronous_commit = off")

        # Prepare and execute update
        update_data = prepare_data(batch)
        execute_values(cursor, UPDATE_QUERY, update_data, page_size=1000)

        # ✅ IMPORTANT: Each batch commits independently
        # No waiting for other workers
        conn.commit()

        cursor.close()
        conn.close()

        return (batch_id, len(batch), None)

    except Exception as e:
        if conn:
            try:
                conn.rollback()
                conn.close()
            except:
                pass
        return (batch_id, 0, str(e))
```

**Why `synchronous_commit = off`?**
- **Before**: PostgreSQL waits for WAL to be physically written to disk (~3-10s)
- **After**: PostgreSQL returns immediately, writes in background (~0.1-1s)
- **Safety**: Data remains durable, just a few milliseconds delay
- **Gain**: 2-5x faster commits, especially with multiple parallel workers

---

## User Interface

### Progress Bars with tqdm

```python
from tqdm import tqdm

# Simple bar
for item in tqdm(items, desc="Processing", unit="item"):
    process(item)

# Bar with dynamic stats
with tqdm(total=len(items), desc="Processing") as pbar:
    for item in items:
        result = process(item)

        # Update displayed stats
        pbar.set_postfix({
            'success': success_count,
            'failed': failed_count,
            'rate': f"{success_rate:.1f}%"
        })
        pbar.update(1)

# Nested bars (batches + items)
for batch in tqdm(batches, desc="Batches", position=0):
    for item in tqdm(batch, desc="Items", position=1, leave=False):
        process(item)
```

### Simplified Output

```python
# ✅ GOOD: Concise and clear messages
print("\n" + "="*80)
print("OWNER-HOUSING DISTANCE CALCULATOR")
print("="*80)
print(f"Processing {len(pairs):,} pairs")
print()

# Progress with tqdm
with tqdm(...) as pbar:
    # ...
    pass

print(f"\n✅ Completed: {success:,} successful, {failed:,} failed")

# ❌ BAD: Too verbose
print("Starting distance calculation...")
print("Loading configuration...")
print("Connecting to database...")
print("Database connected successfully!")
print("Loading pairs from database...")
print("Pairs loaded: 14815032")
print("Starting processing loop...")
# etc. (too much noise)
```

---

## Code Examples

### Complete Script Template

```python
#!/usr/bin/env python3
"""
Data processing script with best practices
"""

import argparse
import logging
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from tqdm import tqdm
from datetime import datetime
from typing import List, Dict
import math
from concurrent.futures import ThreadPoolExecutor, as_completed

class DataProcessor:
    def __init__(self, db_url: str, dry_run: bool = False,
                 batch_size: int = 5000, num_workers: int = 4):
        self.db_url = db_url
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.num_workers = num_workers
        self.conn = None
        self.cursor = None

        self.stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0
        }

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise

    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def get_items_to_process(self, limit: int = None) -> List:
        """Get items that need processing"""
        query = """
        SELECT * FROM items
        WHERE processed_at IS NULL
        ORDER BY id
        """
        if limit:
            query += f" LIMIT {limit}"

        self.cursor.execute(query)
        return self.cursor.fetchall()

    def batch_load_data(self, item_ids: List[str]) -> Dict:
        """Load related data in batch"""
        if not item_ids:
            return {}

        self.cursor.execute("""
            SELECT * FROM related_data
            WHERE item_id = ANY(%s)
        """, (item_ids,))

        return {row['item_id']: row for row in self.cursor.fetchall()}

    def process_item(self, item: Dict, related_data: Dict) -> Dict:
        """Process a single item"""
        # Your processing logic here
        return {
            'item_id': item['id'],
            'result': 'processed',
            'value': 42
        }

    def _update_batch_worker(self, batch_data: tuple) -> tuple:
        """Worker to update a batch in parallel"""
        batch_id, batch, db_url = batch_data

        conn = None
        try:
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # ✅ Asynchronous commits for better performance
            cursor.execute("SET synchronous_commit = off")

            # Prepare updates
            update_data = [
                (item['value'], item['item_id'])
                for item in batch
            ]

            # Execute batch update
            execute_values(
                cursor,
                """
                UPDATE items AS i
                SET result = data.value, processed_at = NOW()
                FROM (VALUES %s) AS data(value, item_id)
                WHERE i.id = data.item_id
                """,
                update_data,
                page_size=1000
            )

            # ✅ Independent commit per batch
            conn.commit()
            cursor.close()
            conn.close()

            return (batch_id, len(batch), None)

        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                    conn.close()
                except:
                    pass
            return (batch_id, 0, str(e))

    def update_database(self, updates: List):
        """Update database with parallel workers"""
        if not updates or self.dry_run:
            print(f"✅ Dry run: {len(updates)} updates prepared")
            return

        print("\n💾 Updating database...")

        # Split into batches
        batches = []
        for i in range(0, len(updates), self.batch_size):
            batch = updates[i:i + self.batch_size]
            batches.append((i // self.batch_size, batch, self.db_url))

        # Process in parallel
        total_success = 0
        with tqdm(total=len(updates), desc="Saving", unit="rec") as pbar:
            with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
                futures = {
                    executor.submit(self._update_batch_worker, batch_data): batch_data
                    for batch_data in batches
                }

                for future in as_completed(futures):
                    batch_id, count, error = future.result()
                    if error:
                        logging.error(f"Batch {batch_id} error: {error}")
                    else:
                        total_success += count
                    pbar.update(count if count > 0 else len(batches[batch_id][1]))

        print(f"✅ Updated {total_success:,} records")

    def run(self, limit: int = None):
        """Main execution"""
        print("="*80)
        print("DATA PROCESSOR")
        print("="*80)
        print(f"Limit: {limit:,} items" if limit else "Processing all items")

        self.connect()

        try:
            # Get items to process
            items = self.get_items_to_process(limit)
            print(f"\n📋 Processing {len(items):,} items")

            if not items:
                print("✅ Nothing to process")
                return

            # Process in batches
            pair_batch_size = 50000
            all_updates = []

            for batch_idx in range(0, len(items), pair_batch_size):
                batch = items[batch_idx:batch_idx + pair_batch_size]

                # Batch load related data
                item_ids = [item['id'] for item in batch]
                related_data = self.batch_load_data(item_ids)

                # Process items
                batch_updates = []
                with tqdm(batch, desc=f"Batch {batch_idx//pair_batch_size + 1}", unit="item") as pbar:
                    for item in pbar:
                        try:
                            result = self.process_item(item, related_data)
                            batch_updates.append(result)
                            self.stats['successful'] += 1
                        except Exception as e:
                            logging.debug(f"Error processing {item['id']}: {e}")
                            self.stats['failed'] += 1

                # Save batch
                if batch_updates:
                    self.update_database(batch_updates)

            # Final stats
            print("\n" + "="*80)
            print("SUMMARY")
            print("="*80)
            print(f"Processed: {self.stats['successful']:,}")
            print(f"Failed: {self.stats['failed']:,}")
            print("="*80)

        finally:
            self.disconnect()

def main():
    parser = argparse.ArgumentParser(description='Process data efficiently')

    parser.add_argument('--db-url', required=True, help='Database URL')
    parser.add_argument('--dry-run', action='store_true', help='Simulation mode')
    parser.add_argument('--limit', type=int, help='Limit items to process')
    parser.add_argument('--batch-size', type=int, default=5000,
                       help='Batch size (default: 5000)')
    parser.add_argument('--num-workers', type=int, default=4,
                       help='Parallel workers (default: 4)')
    parser.add_argument('--debug', action='store_true', help='Enable debug logs')

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.WARNING,
        format='%(levelname)s - %(message)s'
    )

    # Run processor
    processor = DataProcessor(
        db_url=args.db_url,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        num_workers=args.num_workers
    )

    try:
        processor.run(args.limit)
        print("\n✅ Completed successfully")
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
```

---

## Code Quality

### Comments and Documentation

**IMPORTANT**: All comments, docstrings, and variable names must be **in English**.

```python
# ✅ GOOD: Comments in English
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula.

    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point

    Returns:
        Distance in kilometers
    """
    # Convert to radians
    lat1_rad = radians(lat1)
    # ... rest of implementation
    return distance

# ❌ BAD: Comments in French
def calculer_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcule la distance entre deux points avec la formule de Haversine."""
    # Convertir en radians
    lat1_rad = radians(lat1)
```

**Reasons**:
- Consistency with international codebase
- Facilitates collaboration with non-French-speaking developers
- Improves long-term maintainability
- Industry standard

### Unit and Functional Tests

**IMPORTANT**: Implement tests for critical scripts (calculations, data transformations).

```python
# Recommended structure: test_<script_name>.py
"""
Unit and functional tests for <script_name>.py

Run tests with:
    pytest test_<script_name>.py -v
    pytest test_<script_name>.py -k test_specific_function
"""

import pytest
from unittest.mock import Mock, patch

class TestCalculations:
    """Test calculation functions."""

    def test_haversine_distance_same_location(self):
        """Distance between same coordinates should be 0."""
        distance = haversine_distance(48.8566, 2.3522, 48.8566, 2.3522)
        assert distance == 0.0

    def test_haversine_distance_known_cities(self):
        """Test known distance between Paris and Lyon."""
        distance = haversine_distance(48.8566, 2.3522, 45.7640, 4.8357)
        assert 385 < distance < 400  # ~392 km expected

class TestBusinessRules:
    """Test business logic and classification rules."""

    @pytest.fixture
    def processor(self):
        """Create processor instance for testing."""
        return DataProcessor(db_url="mock://localhost")

    def test_classification_same_postal_code(self, processor):
        """Same postal code should return classification 1."""
        result = processor.classify('75001', '75001')
        assert result == 1

class TestEndToEnd:
    """Functional tests simulating real-world scenarios."""

    def test_full_processing_pipeline(self):
        """Test complete data processing pipeline."""
        # Setup
        input_data = [...]

        # Execute
        result = process_data(input_data)

        # Verify
        assert len(result) > 0
        assert result[0]['status'] == 'success'
```

**Types of tests to implement**:

1. **Unit tests**: Mathematical functions, calculations, transformations
   - Distance calculations (Haversine, etc.)
   - Classification rules
   - Data validation

2. **Integration tests**: Database interactions (with mocks)
   - Batch loading
   - Bulk updates
   - Error handling

3. **Functional tests**: End-to-end scenarios
   - Real use cases
   - Edge cases
   - Data completeness

**Recommended tools**:
- `pytest`: Testing framework
- `unittest.mock`: Dependency mocking
- `pytest-cov`: Code coverage
- `pytest.fixture`: Reusable setup/teardown

**Example commands**:
```bash
# Run all tests
pytest test_script.py -v

# Run specific tests
pytest test_script.py -k test_haversine

# With code coverage
pytest test_script.py --cov=script --cov-report=html

# Watch mode (automatically rerun)
pytest-watch test_script.py
```

---

## Pre-Production Checklist

### Code & Structure
- [ ] **English comments**: All comments, docstrings, and variable names
- [ ] **Tests implemented**: Unit and functional tests with pytest
- [ ] **Error handling**: Try/except per batch, continue on error
- [ ] **CLI args**: --dry-run, --limit, --batch-size, --num-workers

### Database
- [ ] **SQL indexes created**: Knex migration with all necessary indexes
- [ ] **Indexes documented**: Script docstring lists required indexes
- [ ] **Index verification**: `check_required_indexes()` function implemented
- [ ] **Batch processing**: No individual queries in loop
- [ ] **Batch loading**: Use `ANY()` for lookups

### Performance & Resilience
- [ ] **Regular commits**: Commit per batch, not at end
- [ ] **Independent commits**: Each worker does its own commit
- [ ] **Optimized commits**: `SET synchronous_commit = off` for workers
- [ ] **Automatic recovery**: Filter already processed data
- [ ] **Parallelization**: ThreadPoolExecutor for DB updates (default: 6-12 workers)
- [ ] **NaN/NULL handling**: Clean invalid values

### Interface & Monitoring
- [ ] **Progress bars**: tqdm for visibility
- [ ] **Dry-run mode**: Test without modifications
- [ ] **Minimal logging**: Console WARNING, file INFO
- [ ] **Timing logs**: Verify parallelism (first batches)
- [ ] **Final stats**: Display summary at end

---

## Expected Performance

| Optimization | Approximate Gain |
|--------------|------------------|
| Batch updates vs individual | **100-1000x** |
| Batch loading with ANY() | **10-100x** |
| Parallelization (6 workers) | **4-6x** |
| Batch vs final commits | **10-50x** |
| `synchronous_commit = off` | **2-5x** (on commits) |
| Skip processed data | **∞** (instant recovery) |

### Cumulative Impact of Optimizations

Concrete example (owner-housing-distances script):
- **Before**: ~2 weeks estimated (memory loading impossible)
- **After**: ~12-24 hours (batch processing + parallelization + optimized commits)

---

## References

- Reference scripts:
  - `server/src/scripts/owner-housing-distances/calculate_distances.py`
  - `server/src/scripts/owner-housing-distances/test_calculate_distances.py` (tests)
  - `server/src/scripts/import-dpe/import-dpe.py`

- PostgreSQL documentation:
  - [Batch Operations](https://www.psycopg.org/psycopg3/docs/api/sql.html)
  - [Connection Pooling](https://www.psycopg.org/docs/pool.html)

- Testing documentation:
  - [Pytest Documentation](https://docs.pytest.org/)
  - [unittest.mock Guide](https://docs.python.org/3/library/unittest.mock.html)
