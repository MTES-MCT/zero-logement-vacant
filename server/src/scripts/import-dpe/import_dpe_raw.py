#!/usr/bin/env python3
"""
DPE Raw Data Import Script - Complete Version with ALL 224 fields

This script imports raw DPE (Diagnostic de Performance Énergétique) data from JSONL files
into the dpe_raw PostgreSQL table for archival and analysis purposes.

This version imports ALL 224 fields from the ADEME DPE JSON data, not just a subset.

SUPPORTED INPUT FORMATS:
1. Single JSONL file (legacy): dpe_data.jsonl
2. Year-based directory structure (new):
   dpe_split/
   ├── 2021/
   │   ├── 2021-01.jsonl
   │   ├── 2021-02.jsonl
   │   └── ...
   ├── 2022/
   │   └── ...
   └── ...

REQUIRED SETUP:
1. Generate the complete schema and field list:
   python generate_complete_schema.py dpe_raw_import_YYYYMMDD/

2. Create the database table:
   psql -d <database> -f create_dpe_raw_table_complete.sql

REQUIRED INDEXES:
The following indexes are created by the table creation script for optimal performance:
- idx_dpe_raw_code_insee: Speeds up queries by INSEE commune code
- idx_dpe_raw_code_postal: Speeds up queries by postal code
- idx_dpe_raw_code_departement: Speeds up queries by department code
- idx_dpe_raw_etiquette_dpe: Speeds up queries by energy label
- idx_dpe_raw_date_etablissement: Speeds up queries by DPE date
- idx_dpe_raw_type_batiment: Speeds up queries by building type
- idx_dpe_raw_numero_dpe: Speeds up queries by DPE number
- idx_dpe_raw_location: Speeds up location-based queries

FEATURES:
- Imports ALL 224 fields from DPE JSON data
- Supports year-based directory structure with progress per year
- Parallel batch processing with configurable workers (default: 6)
- Automatic resume capability: skips already imported DPE records
- Department-based partitioning for memory efficiency (single file mode)
- Idempotent partitioning: automatically recreates partitions if source/limit changes
- Robust error handling and retry logic
- Progress tracking with tqdm (per year or per department)
- Dry-run mode for testing
- Sequential or parallel department processing

DEPENDENCIES:
    pip install psycopg2-binary tqdm

USAGE:
    # Import from year-based directory structure (recommended)
    python import_dpe_raw.py /path/to/dpe_split --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Import specific year only
    python import_dpe_raw.py /path/to/dpe_split --year 2023 --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Import from single JSONL file (legacy mode)
    python import_dpe_raw.py dpe_data_complete.jsonl --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Import all departments sequentially (one at a time)
    python import_dpe_raw.py dpe_data_complete.jsonl --sequential --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Resume from specific department (e.g., skip 01-49, start from 50)
    python import_dpe_raw.py dpe_data_complete.jsonl --sequential --start-department 50 --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Import only department 75 (Paris)
    python import_dpe_raw.py dpe_data_complete.jsonl --department 75 --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Test mode with dry-run
    python import_dpe_raw.py dpe_data_complete.jsonl --department 69 --limit 1000 --dry-run --db-url "postgresql://user:pass@localhost:5432/mydb"

    # High-performance processing with custom workers
    python import_dpe_raw.py dpe_data_complete.jsonl --max-workers 8 --batch-size 2000 --db-url "postgresql://user:pass@localhost:5432/mydb"

    # Using environment variable
    export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
    python import_dpe_raw.py dpe_data_complete.jsonl --db-url "$DATABASE_URL"
"""

import argparse
import json
import logging
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import psycopg2
from psycopg2.extras import DictCursor, execute_values
from tqdm import tqdm

# Import auto-generated field list
try:
    from dpe_raw_fields import DPE_RAW_FIELDS, JSON_TO_DB_FIELD_MAPPING
except ImportError:
    print("ERROR: dpe_raw_fields.py not found!")
    print("Please run: python generate_complete_schema.py dpe_raw_import_YYYYMMDD/")
    sys.exit(1)


class DPERawImporter:
    def __init__(self, db_url: str, dry_run: bool = False,
                 batch_size: int = 2000, max_workers: int = 6, truncate: bool = False):
        """
        Initialize the DPE raw data importer

        Args:
            db_url: PostgreSQL connection URI
            dry_run: If True, only logs without DB modifications
            batch_size: Batch size for SQL inserts
            max_workers: Number of parallel workers
            truncate: If True, truncate table before import
        """
        self.db_url = db_url
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.max_workers = max_workers
        self.truncate = truncate
        self.logger = self._setup_logger()
        self.start_time = datetime.now()

        # Thread-safe statistics
        self.stats = {
            'lines_read': 0,
            'records_inserted': 0,
            'records_skipped': 0,
            'records_failed': 0,
            'duplicates_found': 0,
            'departments_processed': 0,
            'departments_total': 0,
            'years_processed': 0,
            'years_total': 0
        }

        # Per-year statistics for year-based imports
        self.year_stats = {}

    def _setup_logger(self) -> logging.Logger:
        """Configure logging system"""
        logger = logging.getLogger('dpe_raw_importer')
        logger.setLevel(logging.INFO)

        # Clear existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)

        # File handler with timestamp
        log_filename = f'dpe_raw_import_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
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

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=DictCursor)
            self.logger.info("Database connection established")
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            raise

    def disconnect(self):
        """Close database connection"""
        if hasattr(self, 'cursor') and self.cursor:
            self.cursor.close()
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
            self.logger.info("Database connection closed")

    def check_table_exists(self) -> bool:
        """Check if dpe_raw table exists"""
        try:
            self.cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'dpe_raw'
                )
            """)
            exists = self.cursor.fetchone()[0]

            if not exists:
                self.logger.error("Table 'dpe_raw' does not exist!")
                self.logger.error("Please run: psql -d <database> -f create_dpe_raw_table.sql")
                return False

            return True
        except Exception as e:
            self.logger.error(f"Error checking table: {e}")
            return False

    def truncate_table(self) -> bool:
        """Truncate dpe_raw table"""
        try:
            if self.dry_run:
                self.logger.info("DRY RUN: Would truncate table dpe_raw")
                return True

            self.logger.info("Truncating table dpe_raw...")
            self.cursor.execute("TRUNCATE TABLE dpe_raw CASCADE")
            self.conn.commit()

            # Get count to verify
            self.cursor.execute("SELECT COUNT(*) FROM dpe_raw")
            count = self.cursor.fetchone()[0]

            if count == 0:
                self.logger.info("✅ Table dpe_raw truncated successfully")
                return True
            else:
                self.logger.error(f"❌ Table truncation failed, {count} records remain")
                return False

        except Exception as e:
            self.logger.error(f"Error truncating table: {e}")
            if self.conn:
                self.conn.rollback()
            return False

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
            Dict with statistics (inserted, skipped, failed)
        """
        # Count total lines for this year
        total_lines = self._count_lines_in_files(files)

        year_inserted = 0
        year_skipped = 0
        year_failed = 0
        year_start = datetime.now()

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

                # Read and process records from file
                records = []
                lines_in_file = 0

                with open(file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        lines_in_file += 1
                        try:
                            data = json.loads(line.strip())
                            record = self._parse_dpe_record(data)
                            if record:
                                records.append(record)
                        except Exception as e:
                            self.logger.debug(f"Error parsing line in {month_name}: {e}")
                            continue

                if not records:
                    pbar.update(lines_in_file)
                    continue

                if self.dry_run:
                    year_inserted += len(records)
                    pbar.update(lines_in_file)
                    continue

                # Split into batches and process
                batches = []
                for i in range(0, len(records), self.batch_size):
                    batch = records[i:i + self.batch_size]
                    batches.append((i // self.batch_size, batch, self.db_url))

                # Process batches in parallel
                with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    futures = {
                        executor.submit(self._insert_batch_worker, batch_data): batch_data
                        for batch_data in batches
                    }

                    for future in as_completed(futures):
                        batch_id, inserted, skipped, error = future.result()

                        if error:
                            self.logger.error(f"Batch error in {month_name}: {error}")
                            year_failed += len(batches[batch_id][1])
                        else:
                            year_inserted += inserted
                            year_skipped += skipped

                pbar.update(lines_in_file)

        year_duration = datetime.now() - year_start
        return {
            'inserted': year_inserted,
            'skipped': year_skipped,
            'failed': year_failed,
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
            self.stats['records_inserted'] += result['inserted']
            self.stats['records_skipped'] += result['skipped']
            self.stats['records_failed'] += result['failed']
            self.stats['years_processed'] += 1

            # Print one-line summary for this year
            duration_str = str(result['duration']).split('.')[0]  # Remove microseconds
            rate = result['inserted'] / max(result['duration'].total_seconds(), 1)
            print(f"✅ {year}: {result['inserted']:,} inserted, {result['skipped']:,} skipped, "
                  f"{result['failed']:,} failed | ⏱️ {duration_str} ({rate:.0f} rec/s)")

    def partition_by_department(self, input_file: str, output_dir: str,
                                max_lines: Optional[int] = None,
                                target_department: Optional[str] = None) -> List[str]:
        """
        Split large JSONL file by department for efficient processing

        Args:
            input_file: Input JSONL file path
            output_dir: Output directory for partition files
            max_lines: Maximum number of lines to process (None = all)
            target_department: Specific department to process (None = all)

        Returns:
            List of partition file paths
        """
        # Check if input file exists
        if not Path(input_file).exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")

        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Count total lines in source file first
        self.logger.info("Counting source file lines...")
        total_lines_source = self._count_lines(input_file)
        if max_lines:
            total_lines_to_process = min(total_lines_source, max_lines)
        else:
            total_lines_to_process = total_lines_source
        self.logger.info(f"Source file: {total_lines_source:,} lines")
        self.logger.info(f"Will process: {total_lines_to_process:,} lines")

        # Check for existing partition files and validate they match the expected line count
        existing_files = sorted([str(f) for f in output_path.glob("dept_*.jsonl")])
        if existing_files:
            # Count total lines in existing partitions
            total_partition_lines = sum(self._count_lines(f) for f in existing_files)

            # Create a marker file to track the limit used for partitioning
            marker_file = output_path / ".partition_info"
            expected_limit = max_lines if max_lines else total_lines_source

            # Check if marker exists and matches
            should_reuse = False
            if marker_file.exists():
                try:
                    with open(marker_file, 'r') as mf:
                        stored_limit = int(mf.read().strip())
                    if stored_limit == expected_limit:
                        should_reuse = True
                        self.logger.info(f"✅ {len(existing_files)} department partitions found")
                        self.logger.info(f"📊 Partition lines: {total_partition_lines:,}")
                        self.logger.info(f"📂 Reusing existing partitions (matching limit: {expected_limit:,})")
                    else:
                        self.logger.warning(f"⚠️  Existing partitions were created with limit {stored_limit:,}")
                        self.logger.warning(f"⚠️  Current request: {expected_limit:,} lines")
                        self.logger.warning(f"🔄 Recreating partitions to match current request")
                except Exception as e:
                    self.logger.warning(f"Could not read partition marker: {e}")
            else:
                self.logger.warning(f"⚠️  Existing partitions have no marker file")
                self.logger.warning(f"🔄 Recreating partitions to ensure consistency")

            if should_reuse:
                if target_department:
                    dept_code = str(target_department).zfill(2) if str(target_department).isdigit() else str(target_department).upper()
                    matching_files = [f for f in existing_files if Path(f).stem.split('_')[1] == dept_code]
                    if matching_files:
                        return matching_files
                    else:
                        self.logger.warning(f"⚠️  Department {dept_code} not found in existing partitions")
                        self.logger.warning(f"🔄 Recreating partitions")
                else:
                    return existing_files

            # Delete existing partitions if they don't match
            self.logger.info("Removing outdated partition files...")
            for f in existing_files:
                Path(f).unlink()
            if marker_file.exists():
                marker_file.unlink()

        # Partition by department
        self.logger.info("Partitioning data by department...")
        dept_files = {}
        dept_file_paths = []
        lines_processed = 0

        try:
            with open(input_file, 'r', encoding='utf-8') as f_in:
                with tqdm(total=total_lines_to_process, desc="Partitioning", unit="lines", ncols=100) as pbar:
                    for line_num, line in enumerate(f_in, 1):
                        if max_lines and line_num > max_lines:
                            break

                        lines_processed += 1
                        pbar.update(1)

                        try:
                            line_stripped = line.strip()
                            if not line_stripped:
                                continue

                            data = json.loads(line_stripped)

                            # Get department code
                            dept_code = data.get('code_departement_ban')
                            if not dept_code:
                                continue

                            # Normalize department code (2 digits or 2A/2B)
                            dept_code = str(dept_code).zfill(2) if dept_code.isdigit() else str(dept_code).upper()

                            # Filter by target department if specified
                            if target_department:
                                target_normalized = str(target_department).zfill(2) if str(target_department).isdigit() else str(target_department).upper()
                                if dept_code != target_normalized:
                                    continue

                            # Open department file if not already open
                            if dept_code not in dept_files:
                                dept_file_path = output_path / f"dept_{dept_code}.jsonl"
                                dept_files[dept_code] = open(dept_file_path, 'w', encoding='utf-8')
                                dept_file_paths.append(str(dept_file_path))
                                self.logger.debug(f"New department detected: {dept_code}")

                            # Write to department file
                            dept_files[dept_code].write(json.dumps(data, ensure_ascii=False) + '\n')

                        except json.JSONDecodeError as e:
                            self.logger.warning(f"Line {line_num}: invalid JSON - {e}")
                            continue
                        except Exception as e:
                            self.logger.error(f"Error line {line_num}: {e}")
                            continue

        except Exception as e:
            self.logger.error(f"Error reading file: {e}")
            raise
        finally:
            # Close all department files
            for f in dept_files.values():
                f.close()

        self.logger.info(f"Partitioning completed:")
        self.logger.info(f"  - {len(dept_files)} departments found")
        self.logger.info(f"  - {lines_processed:,} lines processed")
        self.logger.info(f"  - Departments: {sorted(list(dept_files.keys()))}")

        # Create marker file to track the limit used for this partitioning
        marker_file = output_path / ".partition_info"
        limit_used = max_lines if max_lines else total_lines_source
        with open(marker_file, 'w') as mf:
            mf.write(str(limit_used))
        self.logger.info(f"📝 Created partition marker with limit: {limit_used:,}")

        return sorted(dept_file_paths)

    def _parse_dpe_record(self, data: Dict) -> Optional[Dict]:
        """
        Parse and validate a DPE record from JSON - imports ALL 224 fields

        Args:
            data: Raw JSON data

        Returns:
            Parsed record dict or None if invalid
        """
        try:
            # Extract DPE ID (required)
            dpe_id = data.get('_id')
            if not dpe_id:
                return None

            # Parse dates
            def parse_date(date_str: Optional[str]) -> Optional[str]:
                if not date_str:
                    return None
                try:
                    # Validate date format YYYY-MM-DD
                    datetime.strptime(date_str, '%Y-%m-%d')
                    return date_str
                except (ValueError, TypeError):
                    return None

            # Convert Lambert 93 (x, y) to WGS84 (lat, lon) if coordinates are available
            latitude = None
            longitude = None
            x_ban = data.get('coordonnee_cartographique_x_ban')
            y_ban = data.get('coordonnee_cartographique_y_ban')

            if x_ban and y_ban:
                try:
                    # Lambert 93 to WGS84 conversion (simplified approximation)
                    # For precise conversion, use pyproj library
                    # This is a rough approximation for France
                    lat_approx = 42.0 + (y_ban - 6000000.0) / 111320.0
                    lon_approx = -5.0 + (x_ban - 700000.0) / (111320.0 * 0.7)  # 0.7 is cos(latitude) approximation

                    # Validate coordinates are within France bounds
                    if 41.0 <= lat_approx <= 51.5 and -5.5 <= lon_approx <= 10.0:
                        latitude = lat_approx
                        longitude = lon_approx
                except (ValueError, TypeError):
                    pass

            # Build record with ALL fields from JSON
            record = {}

            # Map all JSON fields to database fields
            for json_field, db_field in JSON_TO_DB_FIELD_MAPPING.items():
                value = data.get(json_field)

                # Special handling for date fields
                if 'date_' in db_field and value:
                    value = parse_date(value)

                record[db_field] = value

            # Override/add calculated and RNB fields
            if latitude:
                record['latitude'] = latitude
            if longitude:
                record['longitude'] = longitude
            # Ensure RNB fields are included (may be None)
            if 'id_rnb' not in record:
                record['id_rnb'] = data.get('id_rnb')
            if 'provenance_id_rnb' not in record:
                record['provenance_id_rnb'] = data.get('provenance_id_rnb')

            return record

        except Exception as e:
            self.logger.debug(f"Error parsing record: {e}")
            return None

    def _insert_batch_worker(self, batch_data: tuple, max_retries: int = 3) -> tuple:
        """
        Worker function to insert a single batch in parallel with retry logic

        Args:
            batch_data: Tuple of (batch_id, batch_records, db_url)
            max_retries: Maximum number of retry attempts on connection errors

        Returns:
            Tuple of (batch_id, inserted_count, skipped_count, error)
        """
        import time as time_module

        batch_id, batch, db_url = batch_data

        # Prepare insert data once - use ALL fields
        insert_data = []
        for record in batch:
            # Build tuple with all fields in the same order as DPE_RAW_FIELDS
            row = tuple(record.get(field) for field in DPE_RAW_FIELDS)
            insert_data.append(row)

        # Generate column list (excluding internal fields like _geopoint, _i, _rand, _score)
        db_columns = [f for f in DPE_RAW_FIELDS if not f.startswith('_') or f == 'dpe_id']

        # Build INSERT query dynamically
        columns_str = ', '.join(db_columns)
        insert_query = f"""
        INSERT INTO dpe_raw ({columns_str})
        VALUES %s
        ON CONFLICT (dpe_id) DO NOTHING
        """

        # Filter out internal fields from insert data
        filtered_insert_data = []
        internal_indices = [i for i, f in enumerate(DPE_RAW_FIELDS) if f.startswith('_') and f != 'dpe_id']

        for row in insert_data:
            filtered_row = tuple(v for i, v in enumerate(row) if i not in internal_indices)
            filtered_insert_data.append(filtered_row)

        # Retry loop with exponential backoff
        last_error = None
        for attempt in range(max_retries):
            conn = None
            try:
                # Each worker creates its own connection with timeout
                conn = psycopg2.connect(db_url, connect_timeout=30)
                cursor = conn.cursor()

                # Set statement timeout to avoid hanging
                cursor.execute("SET statement_timeout = '120s'")

                # Use asynchronous commits for better performance
                cursor.execute("SET synchronous_commit = off")

                # Get count before insert
                cursor.execute("SELECT COUNT(*) FROM dpe_raw WHERE dpe_id = ANY(%s)",
                              ([r[DPE_RAW_FIELDS.index('dpe_id')] for r in insert_data],))
                existing_count = cursor.fetchone()[0]

                # Execute insert
                execute_values(cursor, insert_query, filtered_insert_data, page_size=1000)

                # Commit
                conn.commit()

                cursor.close()
                conn.close()

                inserted_count = len(insert_data) - existing_count
                skipped_count = existing_count

                return (batch_id, inserted_count, skipped_count, None)

            except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
                # Connection errors - retry with backoff
                last_error = e
                if conn:
                    try:
                        conn.close()
                    except:
                        pass

                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) + (attempt * 0.5)  # Exponential backoff: 1s, 2.5s, 5s
                    self.logger.warning(f"Batch {batch_id} connection error (attempt {attempt + 1}/{max_retries}): {e}")
                    self.logger.warning(f"Retrying in {wait_time:.1f}s...")
                    time_module.sleep(wait_time)
                else:
                    self.logger.error(f"Batch {batch_id} failed after {max_retries} attempts: {e}")

            except Exception as e:
                # Other errors - don't retry
                if conn:
                    try:
                        conn.rollback()
                        conn.close()
                    except:
                        pass
                return (batch_id, 0, 0, str(e))

        # All retries exhausted for connection errors
        return (batch_id, 0, 0, str(last_error) if last_error else "Unknown error")

    def _process_department(self, dept_file: str) -> Dict[str, int]:
        """
        Process a single department file

        Args:
            dept_file: Path to department JSONL file

        Returns:
            Dict with statistics (inserted, skipped, failed)
        """
        dept_code = Path(dept_file).stem.split('_')[1]

        # Read all records from department file
        records = []
        with open(dept_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    record = self._parse_dpe_record(data)
                    if record:
                        records.append(record)
                except Exception as e:
                    self.logger.debug(f"Error parsing line in {dept_code}: {e}")
                    continue

        if not records:
            self.logger.warning(f"No valid records found in department {dept_code}")
            return {'inserted': 0, 'skipped': 0, 'failed': 0}

        if self.dry_run:
            self.logger.info(f"DRY RUN: Would insert {len(records)} records for dept {dept_code}")
            return {'inserted': len(records), 'skipped': 0, 'failed': 0}

        # Split into batches
        batches = []
        for i in range(0, len(records), self.batch_size):
            batch = records[i:i + self.batch_size]
            batches.append((i // self.batch_size, batch, self.db_url))

        # Process batches in parallel
        total_inserted = 0
        total_skipped = 0
        total_failed = 0

        with tqdm(total=len(records), desc=f"  Dept {dept_code}", unit="rec", leave=False) as pbar:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {
                    executor.submit(self._insert_batch_worker, batch_data): batch_data
                    for batch_data in batches
                }

                for future in as_completed(futures):
                    batch_id, inserted, skipped, error = future.result()

                    if error:
                        self.logger.error(f"Batch {batch_id} error in dept {dept_code}: {error}")
                        total_failed += len(batches[batch_id][1])
                    else:
                        total_inserted += inserted
                        total_skipped += skipped

                    pbar.update(len(batches[batch_id][1]))

        return {
            'inserted': total_inserted,
            'skipped': total_skipped,
            'failed': total_failed
        }

    def import_departments(self, dept_files: List[str], sequential: bool = False,
                          start_department: Optional[str] = None) -> None:
        """
        Import all departments (sequentially or in parallel)

        Args:
            dept_files: List of department file paths
            sequential: If True, process one department at a time
            start_department: Optional starting department code
        """
        # Filter by start_department if provided
        if start_department:
            start_dept_normalized = str(start_department).zfill(2) if str(start_department).isdigit() else str(start_department).upper()

            start_idx = None
            for idx, dept_file in enumerate(dept_files):
                dept_code = Path(dept_file).stem.split('_')[1]
                if dept_code >= start_dept_normalized:
                    start_idx = idx
                    break

            if start_idx is None:
                self.logger.warning(f"Starting department {start_dept_normalized} not found")
                return

            dept_files = dept_files[start_idx:]
            self.logger.info(f"Starting from department {dept_code}, processing {len(dept_files)} departments")

        self.stats['departments_total'] = len(dept_files)

        # Sequential processing
        if sequential or len(dept_files) == 1:
            self.logger.info(f"Sequential processing of {len(dept_files)} departments")

            for idx, dept_file in enumerate(dept_files, 1):
                dept_code = Path(dept_file).stem.split('_')[1]

                print(f"\n{'='*80}")
                print(f"Processing department {dept_code} ({idx}/{len(dept_files)})")
                print(f"{'='*80}")

                try:
                    result = self._process_department(dept_file)

                    self.stats['records_inserted'] += result['inserted']
                    self.stats['records_skipped'] += result['skipped']
                    self.stats['records_failed'] += result['failed']
                    self.stats['departments_processed'] += 1

                    print(f"✅ Department {dept_code}: {result['inserted']:,} inserted, "
                          f"{result['skipped']:,} skipped, {result['failed']:,} failed")

                except Exception as e:
                    self.logger.error(f"Error processing department {dept_code}: {e}")
                    continue

        # Parallel processing
        else:
            self.logger.info(f"Parallel processing of {len(dept_files)} departments")

            with tqdm(total=len(dept_files), desc="Departments", ncols=120) as pbar:
                with ThreadPoolExecutor(max_workers=min(self.max_workers, len(dept_files))) as executor:
                    futures = {
                        executor.submit(self._process_department, dept_file): dept_file
                        for dept_file in dept_files
                    }

                    for future in as_completed(futures):
                        dept_file = futures[future]
                        dept_code = Path(dept_file).stem.split('_')[1]

                        try:
                            result = future.result()

                            self.stats['records_inserted'] += result['inserted']
                            self.stats['records_skipped'] += result['skipped']
                            self.stats['records_failed'] += result['failed']
                            self.stats['departments_processed'] += 1

                            self.logger.info(f"Department {dept_code}: {result['inserted']:,} inserted")

                        except Exception as e:
                            self.logger.error(f"Error processing department {dept_code}: {e}")

                        pbar.update(1)
                        pbar.set_postfix({
                            'Inserted': self.stats['records_inserted'],
                            'Skipped': self.stats['records_skipped']
                        })

    def print_report(self) -> None:
        """Display final import report"""
        total_time = datetime.now() - self.start_time

        print("\n" + "="*80)
        print("DPE RAW DATA IMPORT REPORT")
        print("="*80)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'PRODUCTION'}")
        print(f"Total time: {total_time}")
        print(f"Parallel workers: {self.max_workers}")
        print(f"Batch size: {self.batch_size}")
        print()

        # Show year-based stats if available
        if self.year_stats:
            print("STATISTICS BY YEAR:")
            print("-" * 60)
            for year in sorted(self.year_stats.keys()):
                stats = self.year_stats[year]
                duration_str = str(stats['duration']).split('.')[0]
                rate = stats['inserted'] / max(stats['duration'].total_seconds(), 1)
                print(f"  {year}: {stats['inserted']:,} inserted, {stats['skipped']:,} skipped, "
                      f"{stats['failed']:,} failed ({duration_str}, {rate:.0f}/s)")
            print("-" * 60)
            print()

        print("GLOBAL STATISTICS:")
        if self.stats['years_total'] > 0:
            print(f"  Years processed: {self.stats['years_processed']}/{self.stats['years_total']}")
        if self.stats['departments_total'] > 0:
            print(f"  Departments processed: {self.stats['departments_processed']}/{self.stats['departments_total']}")
        print(f"  Records inserted: {self.stats['records_inserted']:,}")
        print(f"  Records skipped (duplicates): {self.stats['records_skipped']:,}")
        print(f"  Records failed: {self.stats['records_failed']:,}")
        print()

        if total_time.total_seconds() > 0:
            records_per_second = self.stats['records_inserted'] / total_time.total_seconds()
            print(f"PERFORMANCE:")
            print(f"  Records/second: {records_per_second:.1f}")
            print()

        print(f"Detailed logs: {self.log_filename}")
        print("="*80)

    def run(self, input_path: str, output_dir: str = None,
            limit: Optional[int] = None, department: Optional[str] = None,
            sequential: bool = False, start_department: Optional[str] = None,
            target_year: Optional[int] = None, start_year: Optional[int] = None):
        """
        Main execution method

        Args:
            input_path: Input JSONL file path or year-based directory
            output_dir: Output directory for partitions (default: auto-generated)
            limit: Maximum number of lines to process (single file mode only)
            department: Specific department to process (single file mode only)
            sequential: If True, process departments one at a time
            start_department: Starting department code (single file mode only)
            target_year: Specific year to process (year-based mode only)
            start_year: Starting year for resume (year-based mode only)
        """
        # Detect input type
        is_year_based = self._is_year_based_directory(input_path)

        # Set default output directory
        if not output_dir:
            timestamp = datetime.now().strftime("%Y%m%d")
            output_dir = f"dpe_raw_import_{timestamp}"

        print("="*80)
        print("DPE RAW DATA IMPORTER")
        print("="*80)
        print(f"Input: {input_path}")
        print(f"Input type: {'Year-based directory' if is_year_based else 'Single JSONL file'}")
        print(f"Mode: {'DRY RUN' if self.dry_run else 'PRODUCTION'}")
        print(f"Workers: {self.max_workers}")
        print(f"Batch size: {self.batch_size}")
        print(f"Truncate table: {'YES ⚠️' if self.truncate else 'NO'}")

        if is_year_based:
            if target_year:
                print(f"Target year: {target_year}")
            elif start_year:
                print(f"Starting from year: {start_year}")
            else:
                print("Target year: ALL")
        else:
            print(f"Output directory: {output_dir}")
            print(f"Record limit: {limit if limit else 'ALL'}")
            if department:
                print(f"Target department: {department}")
            if start_department:
                print(f"Starting from department: {start_department}")
            print(f"Processing mode: {'Sequential' if sequential or department else 'Parallel'}")

        print("="*80)
        print()

        try:
            # Connect to database
            self.connect()

            # Check if table exists
            if not self.check_table_exists():
                sys.exit(1)

            # Truncate table if requested
            if self.truncate:
                print("\n⚠️  WARNING: --truncate flag detected")
                print("This will DELETE ALL EXISTING DATA in the dpe_raw table!")

                if not self.dry_run:
                    response = input("Are you sure you want to continue? (yes/NO): ")
                    if response.lower() != 'yes':
                        print("Truncate cancelled. Exiting.")
                        sys.exit(0)

                if not self.truncate_table():
                    sys.exit(1)
                print()

            # Branch based on input type
            if is_year_based:
                # Year-based directory processing
                print("📅 Year-based import mode")
                self.import_year_based(input_path, target_year, start_year)
            else:
                # Legacy single file mode with department partitioning
                print("📁 Single file import mode (department partitioning)")

                # Step 1: Partition by department
                print("\nStep 1: Partitioning by department...")
                dept_files = self.partition_by_department(
                    input_path, output_dir, limit, department
                )

                if not dept_files:
                    self.logger.error("No department files generated!")
                    sys.exit(1)

                print(f"\n✅ Created {len(dept_files)} department partition(s)")
                print()

                # Step 2: Import departments
                print("Step 2: Importing to database...")
                self.import_departments(dept_files, sequential, start_department)

            # Print final report
            self.print_report()

        except KeyboardInterrupt:
            self.logger.info("Import interrupted by user")
            self.print_report()
            sys.exit(1)
        except Exception as e:
            self.logger.error(f"Fatal error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            self.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description='Import DPE raw data from JSONL to PostgreSQL',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Import from year-based directory structure (recommended)
  python import_dpe_raw.py /path/to/dpe_split --db-url "postgresql://user:pass@localhost:5432/db"

  # Import specific year only
  python import_dpe_raw.py /path/to/dpe_split --year 2023 --db-url "$DATABASE_URL"

  # Resume from year 2023 (imports 2023, 2024, etc.)
  python import_dpe_raw.py /path/to/dpe_split --start-year 2023 --db-url "$DATABASE_URL"

  # Import from single JSONL file (legacy mode)
  python import_dpe_raw.py data.jsonl --db-url "postgresql://user:pass@localhost:5432/db"

  # Import all departments sequentially
  python import_dpe_raw.py data.jsonl --sequential --db-url "$DATABASE_URL"

  # Import only department 75 (Paris)
  python import_dpe_raw.py data.jsonl --department 75 --db-url "$DATABASE_URL"

  # Resume from department 50
  python import_dpe_raw.py data.jsonl --sequential --start-department 50 --db-url "$DATABASE_URL"

  # Test with dry-run
  python import_dpe_raw.py data.jsonl --department 69 --limit 1000 --dry-run --db-url "$DATABASE_URL"
        """
    )

    # Main arguments
    parser.add_argument('input_path', help='Input JSONL file or year-based directory')
    parser.add_argument('--output-dir', help='Output directory for partitions (single file mode)')
    parser.add_argument('--limit', type=int, help='Maximum number of lines to process (single file mode)')
    parser.add_argument('--dry-run', action='store_true', help='Simulation mode (no DB modifications)')
    parser.add_argument('--truncate', action='store_true',
                       help='Truncate table before import (WARNING: deletes all existing data)')

    # Year-based mode
    parser.add_argument('--year', type=int, help='Specific year to process (year-based mode)')
    parser.add_argument('--start-year', type=int, help='Starting year for resume (year-based mode)')

    # Department filtering (single file mode)
    parser.add_argument('--department', '--dept', type=str,
                       help='Specific department code to process (e.g., 75, 01, 2A) - single file mode')
    parser.add_argument('--start-department', '--start-dept', type=str,
                       help='Starting department code when processing multiple - single file mode')
    parser.add_argument('--sequential', action='store_true',
                       help='Process departments one at a time instead of in parallel')

    # Performance
    parser.add_argument('--batch-size', type=int, default=2000,
                       help='Batch size for SQL operations (default: 2000)')
    parser.add_argument('--max-workers', type=int, default=6,
                       help='Number of parallel workers (default: 6)')

    # Database
    parser.add_argument('--db-url', required=True,
                       help='PostgreSQL connection URI (postgresql://user:pass@host:port/dbname)')

    # Debug
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')

    args = parser.parse_args()

    # Validate arguments
    if args.start_department and args.department:
        parser.error("--start-department cannot be used with --department")
    if args.start_year and args.year:
        parser.error("--start-year cannot be used with --year")

    # Initialize importer
    importer = DPERawImporter(
        db_url=args.db_url,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        max_workers=args.max_workers,
        truncate=args.truncate
    )

    # Enable debug if requested
    if args.debug:
        importer.logger.setLevel(logging.DEBUG)
        for handler in importer.logger.handlers:
            handler.setLevel(logging.DEBUG)

    # Run import
    try:
        importer.run(
            input_path=args.input_path,
            output_dir=args.output_dir,
            limit=args.limit,
            department=args.department,
            sequential=args.sequential,
            start_department=args.start_department,
            target_year=args.year,
            start_year=args.start_year
        )
        print("\n✅ Import completed successfully")
    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
