#!/usr/bin/env python3
"""
DPE (Energy Performance Certificate) JSON Line file processing script for PostgreSQL updates.

This script processes DPE data from JSONL files and updates the buildings table
with energy performance information.

SUPPORTED INPUT FORMATS:
1. Single JSONL file (legacy): dpe_data.jsonl
2. Year-based directory structure (recommended):
   dpe_split/
   ├── 2021/
   │   ├── 2021-01.jsonl
   │   ├── 2021-02.jsonl
   │   └── ...
   ├── 2022/
   │   └── ...
   └── ...

REQUIRED INDEXES:
This script requires the following PostgreSQL indexes for optimal performance.
These should be created via Knex migration before running the script.

- idx_buildings_rnb_id: Speeds up lookups by RNB ID
  CREATE INDEX IF NOT EXISTS idx_buildings_rnb_id ON buildings(rnb_id) WHERE rnb_id IS NOT NULL;

- idx_buildings_dpe_id: Speeds up duplicate DPE checks and resume capability
  CREATE INDEX IF NOT EXISTS idx_buildings_dpe_id ON buildings(dpe_id) WHERE dpe_id IS NOT NULL;

- idx_buildings_building_id_dpe: Speeds up JOIN lookups for BAN address matching
  CREATE INDEX IF NOT EXISTS idx_buildings_building_id_dpe ON buildings(id) WHERE dpe_id IS NULL;

- idx_ban_addresses_ban_id_housing: Speeds up BAN ID lookups for housing addresses
  CREATE INDEX IF NOT EXISTS idx_ban_addresses_ban_id_housing ON ban_addresses(ban_id, ref_id)
  WHERE address_kind = 'Housing' AND ban_id IS NOT NULL;

PERFORMANCE:
- Without indexes: Hours to process large datasets
- With indexes: Minutes (10-100x faster)
- With parallelization: 4-8x additional speedup

Features:
- Supports year-based directory structure with progress per year
- Parallel batch processing with configurable workers (default: 6)
- Automatic retry logic for connection errors
- Resume capability: skip already processed buildings
- Robust error handling and connection pool management
- Progress tracking with tqdm (per year or per file)
- Dry-run mode for testing

Dependencies:
    pip install psycopg2-binary tqdm

Usage:
    # Import from year-based directory structure (recommended)
    python import-dpe.py /path/to/dpe_split --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Import specific year only
    python import-dpe.py /path/to/dpe_split --year 2023 --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Resume from year 2023 (imports 2023, 2024, etc.)
    python import-dpe.py /path/to/dpe_split --start-year 2023 --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Import from single JSONL file (legacy mode)
    python import-dpe.py data.jsonl --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Test mode with dry-run
    python import-dpe.py /path/to/dpe_split --year 2024 --dry-run --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Using environment variable
    export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
    python import-dpe.py /path/to/dpe_split --db-url "$DATABASE_URL"
"""

import json
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import psycopg2
from psycopg2.extras import DictCursor, execute_values
from psycopg2.pool import ThreadedConnectionPool
from psycopg2 import OperationalError, InterfaceError, DatabaseError
import sys
from tqdm import tqdm
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from multiprocessing import cpu_count
import time
import random


class DPEProcessor:
    def __init__(self, db_config: Dict, dry_run: bool = False, max_workers: int = None,
                 batch_size: int = 1000, retry_attempts: int = 3, db_timeout: int = 30, sequential: bool = False):
        """
        Initialize the optimized DPE processor with enhanced error handling

        Args:
            db_config: PostgreSQL database configuration
            dry_run: If True, only logs without DB modifications
            max_workers: Number of parallel workers (default: CPU count)
            batch_size: Batch size for SQL queries
            retry_attempts: Number of retry attempts on connection error
            db_timeout: DB connection timeout in seconds
            sequential: If True, process departments one by one instead of in parallel
        """
        self.db_config = db_config
        self.dry_run = dry_run
        self.logger = self._setup_logger()
        self.start_time = datetime.now()
        self.max_workers = max_workers or 6  # Default to 6 workers for optimal performance
        self.batch_size = batch_size
        self.retry_attempts = retry_attempts
        self.db_timeout = db_timeout
        self.sequential = sequential
        self.db_url = self._build_db_url(db_config)  # Store connection URL for workers

        # Enhanced configuration for PostgreSQL connections with SSL management
        enhanced_db_config = db_config.copy()
        enhanced_db_config.update({
            'connect_timeout': self.db_timeout,
            'keepalives_idle': 300,  # Reduce to avoid timeouts
            'keepalives_interval': 30,
            'keepalives_count': 3,
            # application_name option for debugging
            'application_name': f'dpe_processor_worker_{threading.current_thread().ident}'
        })

        # Optional SSL management
        if db_config.get('sslmode') is None:
            enhanced_db_config['sslmode'] = 'prefer'  # More flexible than require
        
        self.enhanced_db_config = enhanced_db_config

        # Connection pool with robust configuration
        self.connection_pool = None
        self._init_connection_pool()

        # Cache for prepared queries
        self.prepared_queries = {}
        self.stats_lock = threading.Lock()
        self.connection_stats = {
            'created': 0,
            'failed': 0,
            'retries': 0,
            'pool_errors': 0
        }

        # Thread-safe statistics
        self.stats = {
            'lines_processed': 0,
            'lines_filtered': 0,
            'duplicates_removed': 0,
            'successful_updates': 0,
            'failed_updates': 0,
            'unknown_rnb_ids': set(),
            'unknown_ban_ids': set(),
            'case_1_1': 0,  # RNB found, building DPE
            'case_1_2': 0,  # RNB found, apartment DPE
            'case_2_1': 0,  # Plot found, building DPE
            'case_2_2': 0,  # Plot found, apartment DPE
            'skipped_no_method': 0,
            'skipped_no_key': 0,
            'dpe_with_rnb_id': 0,
            'departments_processed': 0,
            'departments_total': 0,
            'years_processed': 0,
            'years_total': 0,
            'current_department': None,
            'connection_errors': 0,
            'retry_successes': 0,
        }

        # Per-year statistics for year-based imports
        self.year_stats = {}

    def _setup_logger(self) -> logging.Logger:
        """Configure simplified logging system"""
        logger = logging.getLogger('dpe_processor')
        logger.setLevel(logging.INFO)

        # Clear existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)

        # File handler with timestamp
        log_filename = f'dpe_processing_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
        file_handler = logging.FileHandler(log_filename, encoding='utf-8')
        file_handler.setLevel(logging.INFO)

        # Console handler - only warnings and errors
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)

        # Simple format
        formatter = logging.Formatter('%(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

        self.log_filename = log_filename

        return logger

    def _build_db_url(self, db_config: Dict) -> str:
        """Build PostgreSQL connection URL from config"""
        return f"postgresql://{db_config['user']}:{db_config['password']}@{db_config['host']}:{db_config.get('port', 5432)}/{db_config['database']}"

    def _init_connection_pool(self):
        """Initialize the connection pool with robust error handling"""
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                self.logger.info(f"Initializing connection pool (attempt {attempt + 1}/{max_attempts})")

                # Test simple connection first
                test_conn = psycopg2.connect(**self.enhanced_db_config)
                test_conn.close()
                self.logger.info("Connection test successful")

                # Create pool with enough connections for all workers + 1 for main thread
                # Cap at 10 to avoid overwhelming the database
                pool_size = min(self.max_workers + 2, 10)
                self.connection_pool = ThreadedConnectionPool(
                    minconn=1,
                    maxconn=pool_size,
                    **self.enhanced_db_config
                )

                self.logger.info(f"Connection pool created: 1-{pool_size} connections")
                return

            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt == max_attempts - 1:
                    self.logger.error("Unable to create connection pool")
                    raise
                time.sleep(2)  # Wait before retry

    def check_required_indexes(self):
        """Check if required indexes exist and warn if missing."""
        required_indexes = [
            'idx_buildings_rnb_id',
            'idx_buildings_dpe_id',
            'idx_buildings_building_id_dpe',
            'idx_ban_addresses_ban_id_housing'
        ]

        conn = None
        try:
            conn = self._get_db_connection_with_retry()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT indexname FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname = ANY(%s)
            """, (required_indexes,))

            existing = {row[0] for row in cursor.fetchall()}
            missing = set(required_indexes) - existing

            cursor.close()

            if missing:
                self.logger.warning("⚠️  WARNING: Missing recommended indexes:")
                for idx in missing:
                    self.logger.warning(f"   - {idx}")
                self.logger.warning("   Performance may be significantly degraded.")
                self.logger.warning("   Create indexes via Knex migration before running in production.")
                print()

        except Exception as e:
            self.logger.warning(f"Could not check indexes: {e}")
        finally:
            if conn:
                self._return_db_connection_safe(conn)

    def _get_db_connection_with_retry(self):
        """Get DB connection with automatic retry and validation"""
        last_error = None
        
        for attempt in range(self.retry_attempts):
            try:
                if not self.connection_pool or self.connection_pool.closed:
                    self.logger.warning("Pool closed, attempting reinitialization")
                    self._init_connection_pool()

                # Get connection from pool
                conn = self.connection_pool.getconn()

                if conn is None:
                    raise OperationalError("Unable to get connection from pool")

                # Validate connection
                if self._validate_connection(conn):
                    with self.stats_lock:
                        self.connection_stats['created'] += 1
                        if attempt > 0:
                            self.connection_stats['retries'] += 1
                            self.stats['retry_successes'] += 1

                    self.logger.debug(f"Connection obtained (attempt {attempt + 1})")
                    return conn
                else:
                    # Invalid connection, close and retry
                    try:
                        conn.close()
                    except Exception:
                        pass
                    self.logger.warning(f"Invalid connection detected (attempt {attempt + 1})")
                    
            except (OperationalError, InterfaceError, DatabaseError) as e:
                last_error = e
                error_msg = str(e).lower()
                
                with self.stats_lock:
                    self.stats['connection_errors'] += 1
                    self.connection_stats['failed'] += 1

                # Detailed error log
                self.logger.warning(f"Connection error (attempt {attempt + 1}/{self.retry_attempts}): {e}")

                # Wait with exponential backoff
                if attempt < self.retry_attempts - 1:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    self.logger.info(f"Waiting {wait_time:.1f}s before retry...")
                    time.sleep(wait_time)

                    # Try to recreate pool if serious error
                    if 'ssl' in error_msg or 'eof' in error_msg or 'connection' in error_msg:
                        try:
                            self.logger.info("Recreating connection pool...")
                            if hasattr(self, 'connection_pool') and self.connection_pool:
                                self.connection_pool.closeall()
                            self._init_connection_pool()
                        except Exception as pool_error:
                            self.logger.error(f"Pool recreation failed: {pool_error}")
            
            except Exception as e:
                last_error = e
                self.logger.error(f"Unexpected connection error: {e}")
                time.sleep(1)

        # All attempts failed
        error_msg = f"Unable to establish DB connection after {self.retry_attempts} attempts"
        if last_error:
            error_msg += f". Last error: {last_error}"

        self.logger.error(error_msg)
        raise OperationalError(error_msg)

    def _validate_connection(self, conn) -> bool:
        """Validates that a connection is usable"""
        try:
            if conn.closed != 0:
                return False

            # Simple test with short timeout
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                return result is not None and result[0] == 1

        except Exception as e:
            self.logger.debug(f"Connection validation failed: {e}")
            return False

    def _return_db_connection_safe(self, conn):
        """Safely return a connection to the pool"""
        try:
            if not conn or conn.closed != 0:
                self.logger.debug("Connection closed, cannot be returned to pool")
                return

            if hasattr(self, 'connection_pool') and self.connection_pool and not self.connection_pool.closed:
                # Check if there's an ongoing transaction
                if conn.status != psycopg2.extensions.STATUS_READY:
                    try:
                        conn.rollback()
                        self.logger.debug("Transaction rollback performed before returning connection")
                    except Exception as e:
                        self.logger.warning(f"Rollback error: {e}")

                self.connection_pool.putconn(conn)
                self.logger.debug("Connection returned to pool")
            else:
                # Pool closed, close connection directly
                conn.close()
                self.logger.debug("Pool closed, connection closed directly")

        except Exception as e:
            self.logger.warning(f"Error returning connection to pool: {e}")
            # Force close on error
            try:
                if conn and conn.closed == 0:
                    conn.close()
            except Exception:
                pass

    def _count_lines(self, file_path: str) -> int:
        """Count the number of lines in a file with progress bar"""
        file_size = Path(file_path).stat().st_size

        with open(file_path, 'rb') as f:
            with tqdm(
                total=file_size,
                desc="Counting lines",
                unit="B",
                unit_scale=True,
                ncols=80
            ) as pbar:
                lines = 0
                buffer_size = 1024 * 1024  # 1MB buffer

                while True:
                    buffer = f.read(buffer_size)
                    if not buffer:
                        break
                    lines += buffer.count(b'\n')
                    pbar.update(len(buffer))

                return lines

    def _is_year_based_directory(self, input_path: str) -> bool:
        """Check if input path is a year-based directory structure"""
        path = Path(input_path)
        if not path.is_dir():
            return False

        # Check for year subdirectories (2021, 2022, 2023, 2024, etc.)
        for item in path.iterdir():
            if item.is_dir() and item.name.isdigit() and len(item.name) == 4:
                # Check if it contains JSONL files
                jsonl_files = list(item.glob("*.jsonl"))
                if jsonl_files:
                    return True
        return False

    def _get_year_directories(self, input_path: str, target_year: Optional[int] = None,
                               start_year: Optional[int] = None) -> List[tuple]:
        """
        Get list of year directories with their JSONL files

        Args:
            input_path: Root directory containing year subdirectories
            target_year: Optional specific year to process (only this year)
            start_year: Optional starting year (process this year and all following)

        Returns:
            List of tuples (year, list_of_jsonl_files)
        """
        path = Path(input_path)
        year_dirs = []

        for item in sorted(path.iterdir()):
            if item.is_dir() and item.name.isdigit() and len(item.name) == 4:
                year = int(item.name)

                # Filter by target year if specified (exact match)
                if target_year and year != target_year:
                    continue

                # Filter by start year (skip years before start_year)
                if start_year and year < start_year:
                    continue

                # Get all JSONL files for this year, sorted by month
                jsonl_files = sorted(item.glob("*.jsonl"))
                if jsonl_files:
                    year_dirs.append((year, [str(f) for f in jsonl_files]))

        return year_dirs

    def _count_lines_in_files(self, files: List[str]) -> int:
        """Count total lines across multiple files"""
        total = 0
        for f in files:
            total += self._count_lines(f)
        return total

    def _process_year_files(self, year: int, files: List[str]) -> Dict[str, int]:
        """
        Process all JSONL files for a given year

        Args:
            year: Year being processed
            files: List of JSONL file paths for this year

        Returns:
            Dict with statistics (successful_updates, failed_updates, etc.)
        """
        # Check required indexes before processing (only once per year)
        self.check_required_indexes()

        # Count total lines for this year
        print(f"\n📊 Counting records for year {year}...")
        total_lines = self._count_lines_in_files(files)
        print(f"   Total: {total_lines:,} records across {len(files)} files")

        year_updates = 0
        year_failed = 0
        year_skipped = 0
        year_start = datetime.now()

        # Get a single database connection for the entire year
        conn = None
        try:
            if not self.dry_run:
                conn = self._get_db_connection_with_retry()
                cursor = conn.cursor(cursor_factory=DictCursor)

            # Create progress bar for this year
            with tqdm(
                total=total_lines,
                desc=f"📅 {year}",
                unit="rec",
                ncols=120,
                bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]'
            ) as pbar:

                for file_path in files:
                    month_name = Path(file_path).stem  # e.g., "2023-07"

                    # Read and process DPE records from file in streaming mode
                    batch = []
                    lines_in_file = 0
                    batch_size = min(self.batch_size, 500)

                    with open(file_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            lines_in_file += 1
                            try:
                                dpe_data = json.loads(line.strip())
                                # Filter: only keep records with id_rnb or identifiant_ban
                                if dpe_data.get('id_rnb') or dpe_data.get('identifiant_ban'):
                                    batch.append(dpe_data)

                                    # Process batch when it reaches the target size
                                    if len(batch) >= batch_size:
                                        if self.dry_run:
                                            year_updates += len(batch)
                                        else:
                                            try:
                                                updates_count = self._process_dpe_batch(cursor, batch, month_name)
                                                year_updates += updates_count
                                                conn.commit()
                                            except Exception as batch_error:
                                                self.logger.error(f"Error in batch for {month_name}: {batch_error}")
                                                year_failed += len(batch)
                                                try:
                                                    conn.rollback()
                                                except:
                                                    pass
                                        pbar.update(len(batch))
                                        batch = []

                            except json.JSONDecodeError:
                                continue

                    # Process remaining records in the last batch
                    if batch:
                        if self.dry_run:
                            year_updates += len(batch)
                        else:
                            try:
                                updates_count = self._process_dpe_batch(cursor, batch, month_name)
                                year_updates += updates_count
                                conn.commit()
                            except Exception as batch_error:
                                self.logger.error(f"Error in batch for {month_name}: {batch_error}")
                                year_failed += len(batch)
                                try:
                                    conn.rollback()
                                except:
                                    pass
                        pbar.update(len(batch))

                    # Update progress for filtered lines (lines without id_rnb/identifiant_ban)
                    remaining = lines_in_file - pbar.n % lines_in_file if pbar.n > 0 else 0
                    if remaining > 0 and remaining < lines_in_file:
                        pbar.update(remaining)

        except Exception as e:
            self.logger.error(f"Error processing year {year}: {e}")
            import traceback
            self.logger.debug(f"Traceback:\n{traceback.format_exc()}")
        finally:
            if conn:
                self._return_db_connection_safe(conn)

        year_duration = datetime.now() - year_start
        return {
            'successful_updates': year_updates,
            'failed_updates': year_failed,
            'skipped': year_skipped,
            'total_records': total_lines,
            'duration': year_duration
        }

    def import_year_based(self, input_path: str, target_year: Optional[int] = None,
                          start_year: Optional[int] = None) -> None:
        """
        Import from year-based directory structure

        Args:
            input_path: Root directory containing year subdirectories
            target_year: Optional specific year to process (only this year)
            start_year: Optional starting year (resume from this year)
        """
        year_dirs = self._get_year_directories(input_path, target_year, start_year)

        if not year_dirs:
            self.logger.error(f"No year directories found in {input_path}")
            return

        self.stats['years_total'] = len(year_dirs)

        print(f"\n📊 Found {len(year_dirs)} year(s) to process:")
        for year, files in year_dirs:
            file_count = len(files)
            print(f"   {year}: {file_count} file(s)")
        print()

        # Process each year
        for year, files in year_dirs:
            print(f"\n{'='*80}")
            print(f"📅 Processing year {year} ({len(files)} files)")
            print(f"{'='*80}")

            result = self._process_year_files(year, files)

            # Store per-year stats
            self.year_stats[year] = result

            # Update global stats
            self.stats['successful_updates'] += result['successful_updates']
            self.stats['failed_updates'] += result['failed_updates']
            self.stats['years_processed'] += 1

            # Print one-line summary for this year
            duration_str = str(result['duration']).split('.')[0]  # Remove microseconds
            rate = result['successful_updates'] / max(result['duration'].total_seconds(), 1)
            print(f"✅ {year}: {result['successful_updates']:,} updates, {result['failed_updates']:,} failed "
                  f"| ⏱️ {duration_str} ({rate:.0f} rec/s)")

    def preprocess_jsonl_by_departments(self, input_file: str, output_dir: str, max_lines: Optional[int] = None, target_department: Optional[str] = None) -> List[str]:
        """
        Split JSON Line file by department and preprocess each department

        Args:
            input_file: Input JSON Line file
            output_dir: Output directory for per-department files
            max_lines: Maximum number of lines to process (None = all)
            target_department: Specific department code to process (None = all)

        Returns:
            List of created output files
        """
        # Check that input file exists
        if not Path(input_file).exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")

        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # IMPROVEMENT: Check if processed files already exist
        existing_processed_files = []
        if target_department:
            # Look for specific department file
            dept_code = str(target_department).zfill(2)
            processed_file = output_path / f"dept_{dept_code}_processed.jsonl"
            if processed_file.exists():
                self.logger.info(f"✅ Department {dept_code} already processed file found: {processed_file}")
                self.logger.info("📂 Reusing existing file (delete it to reprocess)")
                existing_processed_files.append(str(processed_file))

                # Update stats
                try:
                    line_count = self._count_lines(str(processed_file))
                    self.stats['lines_filtered'] = line_count
                    self.stats['departments_total'] = 1
                    self.logger.info(f"  Department {dept_code}: {line_count} unique DPE ready")
                except Exception as e:
                    self.logger.warning(f"Error reading stats: {e}")

                return existing_processed_files
        else:
            # Search for all processed files
            existing_processed_files = sorted([str(f) for f in output_path.glob("dept_*_processed.jsonl")])
            if existing_processed_files:
                self.logger.info(f"✅ {len(existing_processed_files)} department files already processed found")
                self.logger.info("📂 Reusing existing files (delete them to reprocess)")

                # Update stats from existing files
                for processed_file in existing_processed_files:
                    try:
                        line_count = self._count_lines(processed_file)
                        self.stats['lines_filtered'] += line_count
                        dept_code = Path(processed_file).stem.split('_')[1]
                        self.logger.debug(f"  Department {dept_code}: {line_count} DPE")
                    except Exception as e:
                        self.logger.warning(f"Error reading stats file {processed_file}: {e}")

                self.stats['departments_total'] = len(existing_processed_files)
                return existing_processed_files

        # Otherwise, proceed with normal preprocessing
        if target_department:
            self.logger.info(f"Starting preprocessing for department {target_department}: {input_file}")
        else:
            self.logger.info(f"Starting preprocessing by departments: {input_file}")

        self.logger.info(f"Output directory: {output_path}")

        # Count total lines
        self.logger.info("Counting file lines...")
        try:
            total_lines = self._count_lines(input_file)
            if max_lines:
                total_lines = min(total_lines, max_lines)
            self.logger.info(f"Total lines to process: {total_lines}")
        except Exception as e:
            self.logger.error(f"Error counting lines: {e}")
            raise

        # Step 1: Split by department (with optional filter)
        try:
            dept_files = self._split_by_departments(input_file, output_path, total_lines, max_lines, target_department)
            if target_department:
                self.logger.info(f"Files for department {target_department}: {len(dept_files)}")
            else:
                self.logger.info(f"Department files created: {len(dept_files)}")
        except Exception as e:
            self.logger.error(f"Error splitting by departments: {e}")
            raise

        # Step 2: Preprocess each department
        try:
            processed_files = self._preprocess_departments(dept_files, output_path)
            self.logger.info(f"Preprocessed files: {len(processed_files)}")
        except Exception as e:
            self.logger.error(f"Error preprocessing departments: {e}")
            raise

        # Clean up temporary split files
        try:
            for dept_file in dept_files:
                Path(dept_file).unlink(missing_ok=True)
            self.logger.debug("Temporary files cleaned up")
        except Exception as e:
            self.logger.warning(f"Error cleaning up: {e}")

        return processed_files

    def _split_by_departments(self, input_file: str, output_path: Path, total_lines: int, max_lines: Optional[int], target_department: Optional[str] = None) -> List[str]:
        """
        Split main file by department (with optional filter)
        """
        if target_department:
            self.logger.info(f"Splitting for specific department: {target_department}")
            # Normalize target department code
            target_department = str(target_department).zfill(2)
        else:
            self.logger.info(f"Splitting by departments for file: {input_file}")

        self.logger.info(f"Total lines to process: {total_lines}")

        # Dictionary for open department files
        dept_files = {}
        dept_file_paths = []
        lines_with_dept = 0
        lines_with_rnb = 0
        lines_with_ban = 0
        lines_target_dept = 0
        lines_kept = 0

        try:
            with open(input_file, 'r', encoding='utf-8') as f_in:
                pbar = tqdm(
                    total=total_lines,
                    desc=f"Splitting {'dept ' + target_department if target_department else 'departments'}",
                    unit="lines",
                    ncols=100
                )

                for line_num, line in enumerate(f_in, 1):
                    if max_lines and line_num > max_lines:
                        break

                    self.stats['lines_processed'] += 1
                    pbar.update(1)

                    # Debug every 10000 lines
                    if line_num % 10000 == 0:
                        if target_department:
                            self.logger.debug(f"Line {line_num}: {lines_target_dept} for dept {target_department}, {lines_with_rnb} with rnb")
                        else:
                            self.logger.debug(f"Line {line_num}: {lines_with_dept} with dept, {lines_with_rnb} with rnb")

                    try:
                        line_stripped = line.strip()
                        if not line_stripped:
                            continue

                        data = json.loads(line_stripped)

                        # Get department code
                        dept_code = data.get('code_departement_ban')
                        if dept_code:
                            lines_with_dept += 1

                            # Normalize department code (2 digits)
                            dept_code = str(dept_code).zfill(2)

                            # If a target department is specified, filter
                            if target_department and dept_code != target_department:
                                continue

                            lines_target_dept += 1

                            # Filter lines with id_rnb OR identifiant_ban
                            id_rnb = data.get('id_rnb')
                            ban_id = data.get('identifiant_ban')

                            if id_rnb or ban_id:
                                lines_kept += 1
                                if id_rnb:
                                    lines_with_rnb += 1
                                    self.stats['dpe_with_rnb_id'] += 1
                                if ban_id:
                                    lines_with_ban += 1

                                # Open department file if necessary
                                if dept_code not in dept_files:
                                    dept_file_path = output_path / f"dept_{dept_code}_raw.jsonl"
                                    dept_files[dept_code] = open(dept_file_path, 'w', encoding='utf-8')
                                    dept_file_paths.append(str(dept_file_path))
                                    if target_department:
                                        self.logger.info(f"Processing target department: {dept_code}")
                                    else:
                                        self.logger.debug(f"New department detected: {dept_code}")

                                # Write to department file
                                dept_files[dept_code].write(json.dumps(data, ensure_ascii=False) + '\n')

                    except json.JSONDecodeError as e:
                        self.logger.warning(f"Line {line_num}: invalid JSON - {e}")
                        continue
                    except Exception as e:
                        self.logger.error(f"Error line {line_num}: {e}")
                        continue

                pbar.close()

        except FileNotFoundError:
            self.logger.error(f"File not found: {input_file}")
            raise
        except Exception as e:
            self.logger.error(f"Error reading file: {e}")
            raise
        finally:
            # Close all files
            for f in dept_files.values():
                f.close()

        if target_department:
            self.logger.info(f"Splitting completed for department {target_department}:")
            self.logger.info(f"  - {lines_target_dept} lines for this department")
            self.logger.info(f"  - {lines_with_rnb} lines with id_rnb")
            self.logger.info(f"  - {lines_with_ban} lines with identifiant_ban")
            self.logger.info(f"  - {lines_kept} total lines kept")
            if target_department not in [Path(f).stem.split('_')[1] for f in dept_file_paths]:
                self.logger.warning(f"  ⚠️  No data found for department {target_department}")
        else:
            self.logger.info(f"Splitting completed:")
            self.logger.info(f"  - {len(dept_files)} departments found")
            self.logger.info(f"  - {lines_with_dept} lines with department code")
            self.logger.info(f"  - {lines_with_rnb} lines with id_rnb")
            self.logger.info(f"  - {lines_with_ban} lines with identifiant_ban")
            self.logger.info(f"  - {lines_kept} total lines kept")
            self.logger.info(f"  - Departments: {sorted(list(dept_files.keys()))}")

        return sorted(dept_file_paths)  # Sort for ordered processing

    def _preprocess_departments(self, dept_files: List[str], output_path: Path) -> List[str]:
        """
        Preprocess each department in parallel (deduplication)
        """
        processed_files = []
        self.stats['departments_total'] = len(dept_files)

        self.logger.info(f"Parallel preprocessing of {len(dept_files)} departments with {self.max_workers} workers...")

        if len(dept_files) == 0:
            self.logger.warning("No department files to preprocess!")
            return []

        # Global progress bar for departments
        dept_pbar = tqdm(
            total=len(dept_files),
            desc="Preprocessing",
            position=0,
            ncols=120
        )

        # Parallelize preprocessing
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all departments
            futures = {}
            for dept_file in dept_files:
                dept_code = Path(dept_file).stem.split('_')[1]
                output_file = output_path / f"dept_{dept_code}_processed.jsonl"

                future = executor.submit(self._preprocess_single_department_parallel, dept_file, str(output_file), dept_code)
                futures[future] = (dept_file, str(output_file), dept_code)

            # Collect results
            for future in as_completed(futures):
                dept_file, output_file, dept_code = futures[future]

                try:
                    lines_processed = future.result()

                    # Verify output file contains data
                    if lines_processed > 0 and Path(output_file).exists():
                        output_lines = self._count_lines(output_file)
                        if output_lines > 0:
                            processed_files.append(output_file)
                            self.logger.debug(f"Department {dept_code}: {output_lines} unique DPE kept")
                        else:
                            self.logger.warning(f"Department {dept_code}: no unique DPE generated")
                            Path(output_file).unlink(missing_ok=True)

                except Exception as e:
                    self.logger.error(f"Error preprocessing department {dept_code}: {e}")

                dept_pbar.update(1)
                dept_pbar.set_postfix({
                    'Completed': dept_code,
                    'Total DPE': self.stats['lines_filtered']
                })

        dept_pbar.close()
        self.logger.info(f"Preprocessing completed: {len(processed_files)} departments with data")
        return processed_files

    def _preprocess_single_department_parallel(self, dept_file: str, output_file: str, dept_code: str) -> int:
        """
        Preprocess a single department in a thread-safe manner
        """
        # Dictionary to store DPE by id_rnb
        dpe_by_rnb = defaultdict(list)
        lines_processed = 0

        # Read and group by id_rnb
        try:
            with open(dept_file, 'r', encoding='utf-8') as f:
                for line in f:
                    lines_processed += 1

                    try:
                        data = json.loads(line.strip())
                        rnb_id = data.get('id_rnb')

                        if rnb_id:
                            dpe_by_rnb[rnb_id].append(data)

                    except json.JSONDecodeError:
                        continue

            # Thread-safe statistics
            local_stats = {
                'lines_filtered': len(dpe_by_rnb),
                'duplicates_removed': sum(len(dpe_list) - 1 for dpe_list in dpe_by_rnb.values() if len(dpe_list) > 1)
            }
            self._update_stats(**local_stats)

            # Deduplication and writing
            with open(output_file, 'w', encoding='utf-8') as f_out:
                for rnb_id, dpe_list in dpe_by_rnb.items():
                    # Sort by date (most recent first)
                    try:
                        dpe_list.sort(
                            key=lambda x: datetime.strptime(x.get('date_etablissement_dpe', '1900-01-01'), '%Y-%m-%d'),
                            reverse=True
                        )
                    except ValueError:
                        pass

                    # Keep the most recent
                    f_out.write(json.dumps(dpe_list[0], ensure_ascii=False) + '\n')

            return lines_processed

        except Exception as e:
            self.logger.error(f"Error preprocessing department {dept_code}: {e}")
            return 0

    def __del__(self):
        """Clean up connection pool"""
        try:
            self.close()
        except Exception:
            # Ignore cleanup errors during destruction
            pass

    def close(self):
        """Explicitly close connection pool"""
        try:
            if hasattr(self, 'connection_pool') and self.connection_pool and not self.connection_pool.closed:
                self.logger.info("Closing connection pool...")
                self.connection_pool.closeall()
                self.logger.info("Connection pool closed")
        except Exception as e:
            self.logger.warning(f"Error closing connection pool: {e}")

    def _update_stats(self, **kwargs):
        """Update statistics in a thread-safe manner"""
        with self.stats_lock:
            for key, value in kwargs.items():
                if key in ['unknown_rnb_ids', 'unknown_ban_ids']:
                    if isinstance(value, (list, set)):
                        self.stats[key].update(value)
                    else:
                        self.stats[key].add(value)
                else:
                    self.stats[key] += value if isinstance(value, (int, float)) else 0

    def _batch_get_buildings_by_rnb_ids(self, cursor, rnb_ids: List[str]) -> Dict[str, Dict]:
        """Fetch only buildings without DPE or that need update"""
        if not rnb_ids:
            return {}

        # OPTIMIZATION: Load only buildings without imported DPE yet
        # This enables script resume without reprocessing already done work
        query = """
        SELECT * FROM buildings
        WHERE rnb_id = ANY(%s)
          AND (dpe_id IS NULL OR dpe_import_match IS NULL)
        """
        cursor.execute(query, (rnb_ids,))
        results = cursor.fetchall()

        return {row['rnb_id']: dict(row) for row in results}

    def _batch_get_buildings_by_ban_ids(self, cursor, ban_ids: List[str]) -> Dict[str, Dict]:
        """Fetch only buildings without DPE via ban_ids"""
        if not ban_ids:
            return {}

        # OPTIMIZATION: Query rewritten to start from ban_addresses for better index usage
        # This uses idx_ban_addresses_ban_id_housing and idx_fast_housing_id indexes
        query = """
        SELECT DISTINCT ON (ba.ban_id) ba.ban_id, b.*
        FROM ban_addresses ba
        JOIN fast_housing fh ON ba.ref_id = fh.id
        JOIN buildings b ON fh.building_id = b.id
        WHERE ba.address_kind = 'Housing'
          AND ba.ban_id = ANY(%s)
          AND (b.dpe_id IS NULL OR b.dpe_import_match IS NULL)
        """
        cursor.execute(query, (ban_ids,))
        results = cursor.fetchall()

        return {row['ban_id']: dict(row) for row in results}

    def _update_batch_worker(self, batch_data: tuple) -> tuple:
        """Worker function to update a single batch in parallel"""
        batch_id, batch, db_url = batch_data

        start_time = time.time()
        thread_id = threading.current_thread().name

        conn = None
        try:
            # Each worker creates its own connection
            conn_start = time.time()
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()

            # Use asynchronous commits for better performance (safe for bulk processing)
            # Each batch still commits independently, just faster
            cursor.execute("SET synchronous_commit = off")

            conn_time = time.time() - conn_start

            # Prepare data
            prep_start = time.time()
            updates_corrected = []
            for update in batch:
                if len(update) == 8:
                    corrected = list(update[:-1])
                    building_id_str = str(update[-1])
                    corrected.append(building_id_str)
                    updates_corrected.append(tuple(corrected))
            prep_time = time.time() - prep_start

            if not updates_corrected:
                cursor.close()
                conn.close()
                return (batch_id, 0, None)

            # Execute bulk update
            exec_start = time.time()
            update_query = """
            UPDATE buildings SET
                dpe_id = data.dpe_id,
                class_dpe = data.class_dpe,
                class_ges = data.class_ges,
                dpe_date_at = data.dpe_date_at::date,
                dpe_type = data.dpe_type,
                heating_building = data.heating_building,
                dpe_import_match = data.dpe_import_match
            FROM (VALUES %s) AS data(dpe_id, class_dpe, class_ges, dpe_date_at, dpe_type, heating_building, dpe_import_match, building_id)
            WHERE buildings.id::text = data.building_id::text
            """
            execute_values(cursor, update_query, updates_corrected, page_size=1000)
            exec_time = time.time() - exec_start

            # Commit (each batch commits independently)
            commit_start = time.time()
            conn.commit()
            commit_time = time.time() - commit_start

            cursor.close()
            conn.close()

            total_time = time.time() - start_time

            # Log timing info (only for first 20 batches to verify parallelism)
            if batch_id < 20:
                self.logger.info(
                    f"[{thread_id}] Batch #{batch_id+1}: {len(updates_corrected)} records in {total_time:.2f}s "
                    f"(conn:{conn_time:.2f}s prep:{prep_time:.2f}s exec:{exec_time:.2f}s "
                    f"commit:{commit_time:.2f}s) ✓ Independent commit completed"
                )

            return (batch_id, len(updates_corrected), None)

        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                    conn.close()
                except:
                    pass
            return (batch_id, 0, str(e))

    def _batch_update_buildings_dpe(self, cursor, updates: List[Tuple], show_progress: bool = True) -> int:
        """Update multiple buildings in parallel batches"""
        if not updates or self.dry_run:
            return len(updates) if self.dry_run else 0

        try:
            # Split into batches for parallel processing
            batch_size = 1000
            batches = []
            for i in range(0, len(updates), batch_size):
                batch = updates[i:i + batch_size]
                batches.append((i // batch_size, batch, self.db_url))

            # Process in parallel with workers
            num_workers = min(self.max_workers, len(batches))
            total_updated = 0
            total_errors = 0

            self.logger.debug(f"Processing {len(batches)} batches with {num_workers} parallel workers...")

            # Only show progress bar if requested (avoid nested progress bars)
            pbar = tqdm(total=len(updates), desc="    Saving to DB", unit="bldg", disable=not show_progress)
            with pbar:
                with ThreadPoolExecutor(max_workers=num_workers) as executor:
                    futures = {
                        executor.submit(self._update_batch_worker, batch_data): batch_data
                        for batch_data in batches
                    }

                    completed_batches = 0
                    for future in as_completed(futures):
                        batch_id, count, error = future.result()
                        completed_batches += 1

                        if error:
                            self.logger.error(f"Error updating batch {batch_id}: {error}")
                            batch_size_for_error = len(batches[batch_id][1])
                            total_errors += batch_size_for_error
                            pbar.update(batch_size_for_error)
                        else:
                            total_updated += count
                            pbar.update(count)

                        # Update progress bar with more info
                        pbar.set_postfix({
                            'completed': f'{completed_batches}/{len(batches)}',
                            'last': f'#{batch_id+1}',
                            'workers': f'{num_workers}↻'
                        })

            if total_errors > 0:
                self.logger.warning(f"Failed to update {total_errors} records")

            return total_updated

        except Exception as e:
            self.logger.error(f"Batch update error: {e}")
            return 0

    def _determine_dpe_priority(self, methode_application_dpe: str) -> int:
        """
        Determine DPE priority based on its method
        0 = max priority (building), 1 = apartment, 2 = others
        """
        if not methode_application_dpe:
            return 2
        
        methode = methode_application_dpe.lower()
        if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
            return 0
        elif 'dpe appartement individuel' in methode:
            return 1
        else:
            return 2

    def _should_import_dpe(self, dpe_data: Dict, existing_dpe: Optional[Dict]) -> tuple[bool, str]:
        """
        Determine if DPE should be imported according to business rules

        Returns:
            (should_import, case_description)
        """
        methode = dpe_data.get('methode_application_dpe', '').lower()

        # Check if it's a building-level DPE
        is_building_dpe = ('dpe immeuble collectif' in methode or
                          'dpe maison individuelle' in methode)

        # Check if it's an apartment DPE
        is_apartment_dpe = 'dpe appartement individuel' in methode

        if existing_dpe:
            # A DPE already exists
            if is_building_dpe:
                return True, "building_dpe_exists"
            else:
                return False, "skip_non_building_dpe"
        else:
            # No DPE exists
            if is_building_dpe:
                return True, "new_building_dpe"
            elif is_apartment_dpe:
                return True, "apartment_dpe"
            else:
                return False, "skip_other_dpe"

    def process_departments(self, processed_files: List[str], start_department: Optional[str] = None) -> None:
        """
        Process all preprocessed departments (sequentially or in parallel) and update database

        Args:
            processed_files: List of preprocessed department files
            start_department: Optional starting department code (e.g., '75', '01', '2A').
                            When provided, skips all departments before this one.
        """
        # Check required indexes before processing
        self.check_required_indexes()

        # Filter files based on start_department if provided
        if start_department:
            # Normalize start department code (pad with zero if numeric)
            start_dept_normalized = start_department.zfill(2) if start_department.isdigit() else start_department.upper()

            # Find the index of the starting department (inclusive - start FROM this dept)
            # Departments are sorted, so we find first dept >= start_dept
            start_idx = None
            available_depts = []
            for idx, processed_file in enumerate(processed_files):
                dept_code = Path(processed_file).stem.split('_')[1]
                available_depts.append(dept_code)
                # Check if this dept is >= start_dept (lexicographic order works for dept codes)
                if dept_code >= start_dept_normalized:
                    start_idx = idx
                    break

            if start_idx is None:
                self.logger.warning(f"Starting department {start_dept_normalized} not found - all departments are before it")
                self.logger.info(f"Available departments: {available_depts}")
                self.logger.info(f"No departments to process")
                processed_files = []  # Empty list, nothing to process
            else:
                skipped_count = start_idx
                processed_files = processed_files[start_idx:]
                self.logger.info(f"Starting from department {dept_code} (>= {start_dept_normalized}), skipping {skipped_count} departments")

        # Determine processing mode
        force_sequential = self.sequential or len(processed_files) == 1

        if force_sequential:
            self.logger.info(f"Sequential processing of {len(processed_files)} departments")
            effective_workers = 1
        else:
            effective_workers = min(self.max_workers, len(processed_files))
            self.logger.info(f"Parallel processing of {len(processed_files)} departments with {effective_workers} workers")

        # Global progress bar
        global_pbar = tqdm(
            total=len(processed_files),
            desc="Departments",
            position=0,
            ncols=120
        )

        # Sequential processing (one department at a time)
        if force_sequential:
            for idx, processed_file in enumerate(processed_files, 1):
                dept_code = Path(processed_file).stem.split('_')[1]

                print(f"\n{'#'*80}")
                print(f"# Processing department {dept_code} ({idx}/{len(processed_files)})")
                print(f"# Total progress: {idx-1}/{len(processed_files)} departments completed")
                print(f"{'#'*80}")

                try:
                    updates_count = self._process_single_department_optimized(processed_file)

                except Exception as e:
                    print(f"\n❌ ERROR: Department {dept_code} failed: {e}")
                    self.logger.error(f"Error processing department {dept_code}: {e}")
                    import traceback
                    self.logger.debug(f"Detailed traceback:\n{traceback.format_exc()}")

                global_pbar.update(1)
                global_pbar.set_postfix({
                    'Success': self.stats['successful_updates'],
                    'Failed': self.stats['failed_updates']
                })

        else:
            # Parallelize department processing
            with ThreadPoolExecutor(max_workers=effective_workers) as executor:
                # Submit all departments
                futures = {
                    executor.submit(self._process_single_department_optimized, processed_file): processed_file
                    for processed_file in processed_files
                }

                # Collect results
                for future in as_completed(futures):
                    processed_file = futures[future]
                    dept_code = Path(processed_file).stem.split('_')[1]

                    try:
                        updates_count = future.result()
                        self.logger.info(f"Department {dept_code}: {updates_count} updates")

                    except Exception as e:
                        self.logger.error(f"Error department {dept_code}: {e}")
                        import traceback
                        self.logger.debug(f"Detailed traceback:\n{traceback.format_exc()}")

                    global_pbar.update(1)
                    global_pbar.set_postfix({
                        'Total success': self.stats['successful_updates'],
                        'Failed': self.stats['failed_updates']
                    })

        global_pbar.close()

    def _process_single_department_optimized(self, processed_file: str) -> int:
        """
        Process a single department with optimized batch processing and robust error handling
        """
        dept_code = Path(processed_file).stem.split('_')[1]

        conn = None
        cursor = None
        total_updates = 0

        try:
            # Read all DPE records from department file
            self.logger.debug(f"Reading file {processed_file}")
            dpe_data_list = []

            print(f"\n{'='*80}")
            print(f"📦 Department {dept_code}: Loading DPE data...")
            print(f"{'='*80}")

            with open(processed_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    try:
                        dpe_data = json.loads(line.strip())
                        dpe_data_list.append(dpe_data)
                    except json.JSONDecodeError as e:
                        self.logger.warning(f"Invalid JSON line {line_num}: {e}")
                        continue

            if not dpe_data_list:
                print(f"⚠️  No valid DPE found for department {dept_code}")
                return 0

            print(f"✅ Loaded {len(dpe_data_list):,} DPE records for department {dept_code}")

            # Get database connection with retry
            self.logger.debug(f"Getting DB connection for department {dept_code}")
            conn = self._get_db_connection_with_retry()
            cursor = conn.cursor(cursor_factory=DictCursor)

            # Process in smaller batches to avoid timeouts
            batch_size = min(self.batch_size, 500)
            batch_count = (len(dpe_data_list) + batch_size - 1) // batch_size

            print(f"🔄 Processing in {batch_count} batches of max {batch_size} records")
            print(f"{'='*80}\n")

            # Progress bar for department
            with tqdm(total=len(dpe_data_list),
                     desc=f"Dept {dept_code}",
                     unit="DPE",
                     ncols=100,
                     bar_format='{desc}: {percentage:3.0f}%|{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]') as pbar:

                for i in range(0, len(dpe_data_list), batch_size):
                    batch_num = (i // batch_size) + 1
                    batch = dpe_data_list[i:i + batch_size]

                    try:
                        updates_count = self._process_dpe_batch(cursor, batch, dept_code)
                        total_updates += updates_count

                        # Commit after each batch
                        if not self.dry_run:
                            conn.commit()

                        # Update progress bar
                        pbar.update(len(batch))
                        pbar.set_postfix({
                            'updates': total_updates,
                            'batch': f'{batch_num}/{batch_count}'
                        })

                    except Exception as batch_error:
                        self.logger.error(f"Error in batch {batch_num} for department {dept_code}: {batch_error}")
                        # Rollback failed batch and continue
                        try:
                            if not self.dry_run:
                                conn.rollback()
                        except Exception as rollback_error:
                            self.logger.warning(f"Rollback error: {rollback_error}")

                        # Update progress bar even on error
                        pbar.update(len(batch))
                        continue

                    # Small delay between batches
                    time.sleep(0.1)

            print(f"\n✅ Department {dept_code} completed: {total_updates:,} updates")
            print(f"{'='*80}\n")

            return total_updates
                
        except Exception as e:
            self.logger.error(f"Error processing department {dept_code}: {e}")
            import traceback
            self.logger.debug(f"Complete traceback:\n{traceback.format_exc()}")

            # Try to rollback on error
            if conn:
                try:
                    if not self.dry_run:
                        conn.rollback()
                        self.logger.debug("Rollback performed after error")
                except Exception as rollback_error:
                    self.logger.warning(f"Rollback error: {rollback_error}")

            return total_updates

        finally:
            # Resource cleanup
            try:
                if cursor:
                    cursor.close()
                    self.logger.debug("Cursor closed")
            except Exception as e:
                self.logger.warning(f"Error closing cursor: {e}")

            if conn:
                self._return_db_connection_safe(conn)

    def _process_dpe_batch(self, cursor, dpe_batch: List[Dict], dept_code: str) -> int:
        """
        Process a batch of DPE with optimized queries and error handling
        """
        try:
            # Separate DPE by search type
            rnb_dpe_map = {}  # id_rnb -> dpe_data
            ban_dpe_map = {}  # identifiant_ban -> dpe_data

            for dpe_data in dpe_batch:
                rnb_id = dpe_data.get('id_rnb')
                ban_id = dpe_data.get('identifiant_ban')

                if rnb_id:
                    rnb_dpe_map[rnb_id] = dpe_data
                elif ban_id:
                    ban_dpe_map[ban_id] = dpe_data

            # Fetch all buildings in 2 batch queries
            buildings_by_rnb = {}
            buildings_by_ban = {}

            if rnb_dpe_map:
                buildings_by_rnb = self._batch_get_buildings_by_rnb_ids(cursor, list(rnb_dpe_map.keys()))

            if ban_dpe_map:
                buildings_by_ban = self._batch_get_buildings_by_ban_ids(cursor, list(ban_dpe_map.keys()))

            # Prepare updates
            updates = []
            stats_update = {
                'successful_updates': 0,
                'failed_updates': 0,
                'case_1_1': 0, 'case_1_2': 0, 'case_2_1': 0, 'case_2_2': 0,
                'skipped_no_key': 0, 'skipped_no_method': 0,
                'unknown_rnb_ids': set(), 'unknown_ban_ids': set()
            }

            # Process DPE found by RNB ID
            rnb_fallback_candidates = []  # DPE with RNB not found but have a BAN ID

            for rnb_id, dpe_data in rnb_dpe_map.items():
                building = buildings_by_rnb.get(rnb_id)
                if building:
                    update_data = self._prepare_dpe_update(dpe_data, building, 'case_1')
                    if update_data:
                        updates.append(update_data)
                        stats_update['successful_updates'] += 1
                        # Update case stats
                        methode = dpe_data.get('methode_application_dpe', '').lower()
                        if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
                            stats_update['case_1_1'] += 1
                        else:
                            stats_update['case_1_2'] += 1
                    else:
                        stats_update['skipped_no_method'] += 1
                else:
                    # RNB ID not found, check if DPE also has a BAN ID
                    ban_id = dpe_data.get('identifiant_ban')
                    if ban_id:
                        rnb_fallback_candidates.append((ban_id, dpe_data))
                    else:
                        stats_update['unknown_rnb_ids'].add(rnb_id)
                        stats_update['skipped_no_key'] += 1

            # Fetch buildings for fallback BAN IDs
            fallback_ban_ids = [ban_id for ban_id, _ in rnb_fallback_candidates]
            if fallback_ban_ids:
                fallback_buildings = self._batch_get_buildings_by_ban_ids(cursor, fallback_ban_ids)

                # Process fallback
                for ban_id, dpe_data in rnb_fallback_candidates:
                    building = fallback_buildings.get(ban_id)
                    if building:
                        update_data = self._prepare_dpe_update(dpe_data, building, 'case_2')
                        if update_data:
                            updates.append(update_data)
                            stats_update['successful_updates'] += 1
                            # Update case stats
                            methode = dpe_data.get('methode_application_dpe', '').lower()
                            if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
                                stats_update['case_2_1'] += 1
                            else:
                                stats_update['case_2_2'] += 1
                        else:
                            stats_update['skipped_no_method'] += 1
                    else:
                        stats_update['unknown_ban_ids'].add(ban_id)
                        # Now count as unknown RNB since it was the primary method
                        stats_update['unknown_rnb_ids'].add(dpe_data.get('id_rnb'))
                        stats_update['skipped_no_key'] += 1

            # Process DPE found by BAN ID
            for ban_id, dpe_data in ban_dpe_map.items():
                building = buildings_by_ban.get(ban_id)
                if building:
                    update_data = self._prepare_dpe_update(dpe_data, building, 'case_2')
                    if update_data:
                        updates.append(update_data)
                        stats_update['successful_updates'] += 1
                        # Update case stats
                        methode = dpe_data.get('methode_application_dpe', '').lower()
                        if 'dpe immeuble collectif' in methode or 'dpe maison individuelle' in methode:
                            stats_update['case_2_1'] += 1
                        else:
                            stats_update['case_2_2'] += 1
                    else:
                        stats_update['skipped_no_method'] += 1
                else:
                    stats_update['unknown_ban_ids'].add(ban_id)
                    stats_update['skipped_no_key'] += 1

            # Execute all updates in batch
            successful_updates = 0
            if updates:
                # Disable internal progress bar to avoid conflicts with department-level progress bar
                successful_updates = self._batch_update_buildings_dpe(cursor, updates, show_progress=False)
                stats_update['successful_updates'] = successful_updates
                stats_update['failed_updates'] = len(updates) - successful_updates

            # Update global statistics in a thread-safe manner
            self._update_stats(**stats_update)

            return successful_updates

        except Exception as e:
            self.logger.error(f"Error processing batch: {e}")
            import traceback
            self.logger.debug(f"Batch traceback:\n{traceback.format_exc()}")
            return 0

    def _prepare_dpe_update(self, dpe_data: Dict, building: Dict, case_type: str) -> Optional[Tuple]:
        """
        Prepare data for batch update
        """
        # Check business rules
        existing_dpe_id = building.get('dpe_id')
        should_import, reason = self._should_import_dpe(dpe_data, existing_dpe_id)

        if not should_import:
            return None

        # Date conversion
        dpe_date = None
        if dpe_data.get('date_etablissement_dpe'):
            try:
                dpe_date = dpe_data['date_etablissement_dpe']
            except ValueError:
                dpe_date = '1900-01-01'

        # Determine match type based on case_type
        if case_type == 'case_1':
            dpe_import_match = 'rnb_id'
        elif case_type == 'case_2':
            dpe_import_match = 'ban_id'
        else:
            dpe_import_match = 'unknown'

        # CORRECTION: Keep building_id as string for comparison
        building_id = str(building.get('id', ''))
        if not building_id:
            self.logger.error(f"Building without ID: {building}")
            return None

        # Return tuple for execute_values with dpe_import_match included
        return (
            dpe_data.get('numero_dpe'),
            dpe_data.get('etiquette_dpe'),
            dpe_data.get('etiquette_ges'),
            dpe_date,
            dpe_data.get('methode_application_dpe'),
            dpe_data.get('type_energie_n1'),
            dpe_import_match,
            building_id  # Now it's a string
        )

    def print_report(self) -> None:
        """Display final report with connection statistics"""
        total_time = datetime.now() - self.start_time

        print("\n" + "="*80)
        print("DPE IMPORT REPORT")
        print("="*80)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'PRODUCTION'}")
        print(f"Total time: {total_time}")
        print(f"Parallel workers: {self.max_workers}")
        print(f"SQL batch size: {self.batch_size}")
        print()

        # Show year-based stats if available
        if self.year_stats:
            print("STATISTICS BY YEAR:")
            print("-" * 60)
            for year in sorted(self.year_stats.keys()):
                stats = self.year_stats[year]
                duration_str = str(stats['duration']).split('.')[0]
                rate = stats['successful_updates'] / max(stats['duration'].total_seconds(), 1)
                print(f"  {year}: {stats['successful_updates']:,} updates, {stats['failed_updates']:,} failed "
                      f"({duration_str}, {rate:.0f}/s)")
            print("-" * 60)
            print()

        print("GLOBAL STATISTICS:")
        if self.stats['years_total'] > 0:
            print(f"  Years processed: {self.stats['years_processed']}/{self.stats['years_total']}")
        if self.stats['departments_total'] > 0:
            print(f"  Departments processed: {self.stats['departments_processed']}/{self.stats['departments_total']}")
        print(f"  Successful updates: {self.stats['successful_updates']:,}")
        print(f"  Failed updates: {self.stats['failed_updates']:,}")
        print()

        if total_time.total_seconds() > 0:
            records_per_second = self.stats['successful_updates'] / total_time.total_seconds()
            print(f"PERFORMANCE:")
            print(f"  Records/second: {records_per_second:.1f}")
            print()

        # Also log to file for reference
        self.logger.info("=" * 80)
        self.logger.info("FINAL REPORT")
        self.logger.info("=" * 80)
        self.logger.info(f"Mode: {'DRY RUN' if self.dry_run else 'PRODUCTION'}")
        self.logger.info(f"Total time: {total_time}")
        self.logger.info(f"Parallel workers: {self.max_workers}")
        self.logger.info(f"SQL batch size: {self.batch_size}")
        self.logger.info(f"Retry attempts: {self.retry_attempts}")
        self.logger.info(f"DB timeout: {self.db_timeout}s")

        # Connection statistics
        self.logger.info("")
        self.logger.info("DB CONNECTION STATISTICS:")
        self.logger.info(f"  Connections created: {self.connection_stats['created']}")
        self.logger.info(f"  Failed connections: {self.connection_stats['failed']}")
        self.logger.info(f"  Connection retries: {self.connection_stats['retries']}")
        self.logger.info(f"  Successful retries: {self.stats['retry_successes']}")
        self.logger.info(f"  Total connection errors: {self.stats['connection_errors']}")

        if self.connection_stats['created'] > 0:
            success_rate_conn = ((self.connection_stats['created'] - self.connection_stats['failed']) / self.connection_stats['created']) * 100
            self.logger.info(f"  Connection success rate: {success_rate_conn:.1f}%")

        self.logger.info("")
        self.logger.info("INPUT DATA:")
        self.logger.info(f"  Lines processed: {self.stats['lines_processed']}")
        self.logger.info(f"  DPE with id_rnb: {self.stats['dpe_with_rnb_id']}")
        self.logger.info(f"  id_rnb rate: {(self.stats['dpe_with_rnb_id'] / max(self.stats['lines_processed'], 1)) * 100:.1f}%")
        self.logger.info(f"  Filtered lines (id_rnb provided): {self.stats['lines_filtered']}")
        self.logger.info(f"  Duplicates removed: {self.stats['duplicates_removed']}")

        if self.stats['years_total'] > 0:
            self.logger.info(f"  Years processed: {self.stats['years_processed']}/{self.stats['years_total']}")
        if self.stats['departments_total'] > 0:
            dept_info = f"{self.stats['departments_processed']}/{self.stats['departments_total']}"
            if self.stats['departments_total'] == 1:
                dept_info += " (specific department)"
            self.logger.info(f"  Departments processed: {dept_info}")
        self.logger.info("")

        # Performance metrics
        if total_time.total_seconds() > 0:
            dpe_per_second = self.stats['successful_updates'] / total_time.total_seconds()
            self.logger.info(f"PERFORMANCE:")
            self.logger.info(f"  DPE processed/second: {dpe_per_second:.1f}")
            if self.stats['departments_total'] > 1:
                self.logger.info(f"  Parallelization gain: ~{self.max_workers}x")
            else:
                self.logger.info(f"  Single department mode: optimized for 1 department")
            self.logger.info("")

        self.logger.info("UPDATES:")
        self.logger.info(f"  Successful: {self.stats['successful_updates']}")
        self.logger.info(f"  Failed: {self.stats['failed_updates']}")

        # Calculate success rate
        total_attempts = self.stats['successful_updates'] + self.stats['failed_updates']
        if total_attempts > 0:
            success_rate = (self.stats['successful_updates'] / total_attempts) * 100
            self.logger.info(f"  Success rate: {success_rate:.1f}%")

        self.logger.info("")
        self.logger.info("DISTRIBUTION BY CASE:")
        self.logger.info(f"  Case 1.1 (RNB + Building DPE): {self.stats['case_1_1']}")
        self.logger.info(f"  Case 1.2 (RNB + Apartment DPE): {self.stats['case_1_2']}")
        self.logger.info(f"  Case 2.1 (Plot + Building DPE): {self.stats['case_2_1']}")
        self.logger.info(f"  Case 2.2 (Plot + Apartment DPE): {self.stats['case_2_2']}")
        self.logger.info("")
        self.logger.info("IGNORED ITEMS:")
        self.logger.info(f"  No join key: {self.stats['skipped_no_key']}")
        self.logger.info(f"  Inadequate DPE method: {self.stats['skipped_no_method']}")
        self.logger.info(f"  Unknown RNB IDs: {len(self.stats['unknown_rnb_ids'])}")
        self.logger.info(f"  Unknown BAN IDs: {len(self.stats['unknown_ban_ids'])}")

        if self.stats['unknown_rnb_ids']:
            self.logger.info("First unknown RNB IDs:")
            for rnb_id in list(self.stats['unknown_rnb_ids'])[:10]:
                self.logger.info(f"  - {rnb_id}")

        if self.stats['unknown_ban_ids']:
            self.logger.info("First unknown BAN IDs:")
            for ban_id in list(self.stats['unknown_ban_ids'])[:10]:
                self.logger.info(f"  - {ban_id}")

        self.logger.info("")
        self.logger.info(f"Detailed logs available in: {getattr(self, 'log_filename', 'log file')}")


def main():
    parser = argparse.ArgumentParser(
        description='DPE JSON Line processor for PostgreSQL - Updates buildings table with DPE data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Import from year-based directory structure (recommended)
  python import-dpe.py /path/to/dpe_split --db-url "postgresql://user:pass@localhost:5432/db"

  # Import specific year only
  python import-dpe.py /path/to/dpe_split --year 2023 --db-url "$DATABASE_URL"

  # Resume from year 2023 (imports 2023, 2024, etc.)
  python import-dpe.py /path/to/dpe_split --start-year 2023 --db-url "$DATABASE_URL"

  # Import from single JSONL file (legacy mode)
  python import-dpe.py data.jsonl --db-url "postgresql://user:pass@localhost:5432/db"

  # Test with dry-run
  python import-dpe.py /path/to/dpe_split --year 2024 --dry-run --db-url "$DATABASE_URL"
        """
    )

    # Main arguments
    parser.add_argument('input_path', help='Input JSONL file or year-based directory (dpe_split/)')
    parser.add_argument('--dry-run', action='store_true', help='Simulation mode (no DB modifications)')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')

    # Year-based mode options
    parser.add_argument('--year', type=int, help='Specific year to process (year-based mode)')
    parser.add_argument('--start-year', type=int, help='Starting year for resume (year-based mode)')

    # Legacy mode options (single JSONL file)
    parser.add_argument('--output-dir', help='Output directory for department files (legacy mode)')
    parser.add_argument('--max-lines', type=int, help='Maximum number of lines to process (legacy mode)')
    parser.add_argument('--department', '--dept', type=str, help='Specific department code (legacy mode)')
    parser.add_argument('--start-department', '--start-dept', type=str, help='Starting department code (legacy mode)')
    parser.add_argument('--sequential', action='store_true', help='Process departments sequentially (legacy mode)')

    # Performance optimizations
    parser.add_argument('--max-workers', type=int, default=6, help='Number of parallel workers (default: 6)')
    parser.add_argument('--batch-size', type=int, default=500, help='SQL batch size (default: 500)')
    parser.add_argument('--retry-attempts', type=int, default=3, help='Number of retry attempts on error (default: 3)')
    parser.add_argument('--db-timeout', type=int, default=30, help='DB connection timeout in seconds (default: 30)')

    # Database configuration - PostgreSQL URI
    parser.add_argument('--db-url', required=True,
                       help='PostgreSQL connection URI (postgresql://user:pass@host:port/dbname)')

    args = parser.parse_args()

    # Validate arguments
    if args.start_year and args.year:
        parser.error("--start-year cannot be used with --year")
    if args.start_department and args.department:
        parser.error("--start-department cannot be used with --department")

    # Parse database URL into config dict for compatibility with existing code
    import urllib.parse
    parsed = urllib.parse.urlparse(args.db_url)

    db_config = {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/') if parsed.path else '',
        'user': parsed.username or '',
        'password': parsed.password or ''
    }

    # Parse query parameters for SSL mode
    query_params = urllib.parse.parse_qs(parsed.query)
    if 'sslmode' in query_params:
        db_config['sslmode'] = query_params['sslmode'][0]
    else:
        db_config['sslmode'] = 'prefer'

    # Initialize processor
    processor = DPEProcessor(
        db_config,
        dry_run=args.dry_run,
        max_workers=args.max_workers,
        batch_size=args.batch_size,
        retry_attempts=args.retry_attempts,
        db_timeout=args.db_timeout,
        sequential=args.sequential
    )

    # Enable debug if requested
    if args.debug:
        processor.logger.setLevel(logging.DEBUG)
        for handler in processor.logger.handlers:
            handler.setLevel(logging.DEBUG)

    # Detect input type
    is_year_based = processor._is_year_based_directory(args.input_path)

    print("="*80)
    print("DPE IMPORTER")
    print("="*80)
    print(f"Input: {args.input_path}")
    print(f"Input type: {'Year-based directory' if is_year_based else 'Single JSONL file'}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'PRODUCTION'}")
    print(f"Workers: {args.max_workers}")
    print(f"Batch size: {args.batch_size}")

    if is_year_based:
        if args.year:
            print(f"Target year: {args.year}")
        elif args.start_year:
            print(f"Starting from year: {args.start_year}")
        else:
            print("Target year: ALL")
    else:
        if args.department:
            print(f"Target department: {args.department}")
        if args.start_department:
            print(f"Starting from department: {args.start_department}")

    print("="*80)
    print()

    try:
        if is_year_based:
            # Year-based directory processing
            print("📅 Year-based import mode")
            processor.import_year_based(args.input_path, args.year, args.start_year)
        else:
            # Legacy single file mode with department partitioning
            print("📁 Single file import mode (department partitioning)")

            # Set default output directory
            if args.output_dir:
                output_dir = args.output_dir
            else:
                timestamp = datetime.now().strftime("%Y%m%d")
                output_dir = f"dpe_processing_{timestamp}"

            # Step 1: Preprocessing by departments
            processed_files = processor.preprocess_jsonl_by_departments(
                args.input_path,
                output_dir,
                args.max_lines,
                args.department
            )

            if not processed_files:
                processor.logger.error("No department files generated! Check input file format.")
                sys.exit(1)

            # Step 2: Processing and parallel DB update
            processor.process_departments(processed_files, start_department=args.start_department)

        # Final report
        processor.print_report()
        print("\n✅ Import completed successfully")

    except KeyboardInterrupt:
        processor.logger.info("Processing interrupted by user")
        processor.print_report()
        sys.exit(1)
    except Exception as e:
        processor.logger.error(f"Fatal error: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        processor.print_report()
        sys.exit(1)
    finally:
        # Explicitly close connection pool to avoid destruction errors
        try:
            processor.close()
            processor.logger.info("Connection pool closed cleanly")
        except Exception as e:
            processor.logger.warning(f"Error closing pool: {e}")


if __name__ == "__main__":
    main()