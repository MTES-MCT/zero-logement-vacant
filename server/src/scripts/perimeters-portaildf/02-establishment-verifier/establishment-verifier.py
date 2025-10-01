#!/usr/bin/env python3
"""
Verify structure permissions (establishments table)

Business rules
--------------
If `acces_lovac` is NULL **or** older than today
→ suspend the establishment (`suspended_at = NOW()`,
  `suspended_cause = 'droits structure expires'`).

Note: This script NO LONGER marks establishments as deleted.
"""

import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional

import psycopg2
import dateutil.parser
import click
from pathlib import Path
import logging

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('structure_verifier.log')
    ]
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class StructureFileRecord:
    siren: str                    # 9-digit SIREN
    acces_lovac: Optional[str]    # ISO-8601 string or None

@dataclass
class DbEstablishment:
    id: str                       # UUID
    siren: Optional[int]
    deleted_at: Optional[str]
    suspended_at: Optional[str]
    suspended_cause: Optional[str]

@dataclass
class Action:
    establishment_id: str
    action_type: str              # 'suspend' only (no longer 'delete')
    executed_at: str
    suspended_cause: Optional[str] = None

@dataclass
class DatabaseConfig:
    """Database configuration."""
    host: str
    port: int
    database: str
    user: str
    password: str
    
    def __post_init__(self):
        """Configuration validation."""
        if not self.host:
            raise ValueError("Database host is required")
        if not self.database:
            raise ValueError("Database name is required")
        if not self.user:
            raise ValueError("Database user is required")
        if not self.password:
            raise ValueError("Database password is required")
        if not (1 <= self.port <= 65535):
            raise ValueError("Database port must be between 1 and 65535")

# ---------------------------------------------------------------------------
# Step 1 : read JSONL file
# ---------------------------------------------------------------------------

def load_structures(jsonl_file: str) -> Dict[str, StructureFileRecord]:
    """Return a dict keyed by SIREN with info from the JSONL file."""
    mapping: Dict[str, StructureFileRecord] = {}
    
    if not Path(jsonl_file).exists():
        logger.error(f"JSONL file not found: {jsonl_file}")
        return mapping
    
    try:
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    siret = data.get('siret')
                    if not siret or len(siret) < 9:
                        logger.warning(f'Line {line_num}: invalid SIRET → skipped')
                        continue
                    siren = siret[:9]
                    mapping[siren] = StructureFileRecord(
                        siren=siren,
                        acces_lovac=data.get('acces_lovac'),
                    )
                except json.JSONDecodeError as e:
                    logger.warning(f'Line {line_num}: invalid JSON → {e}')
        logger.info(f'Structures loaded: {len(mapping)}')
    except IOError as e:
        logger.error(f"Error reading JSONL file: {e}")
    
    return mapping

# ---------------------------------------------------------------------------
# Step 2 : database helpers
# ---------------------------------------------------------------------------

def check_establishments_schema(db_config: DatabaseConfig) -> bool:
    """Ensure required columns exist on `public.establishments`."""
    # Note: We still check for deleted_at to ensure compatibility,
    # but we don't update it
    required_cols = {'deleted_at', 'suspended_at', 'suspended_cause', 'siren'}
    try:
        with psycopg2.connect(**db_config.__dict__) as conn, conn.cursor() as cur:
            cur.execute(
                '''
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'establishments'
                  AND table_schema = 'public';
                '''
            )
            cols = {row[0] for row in cur.fetchall()}
            missing = required_cols - cols
            if missing:
                logger.error(f'Missing columns on establishments: {", ".join(missing)}')
                return False
            return True
    except psycopg2.Error as e:
        logger.error(f'PostgreSQL error: {e}')
        return False

def fetch_establishments(db_config: DatabaseConfig) -> Dict[str, DbEstablishment]:
    """Load all establishments from DB keyed by UUID."""
    query = '''
        SELECT id, siren, deleted_at, suspended_at, suspended_cause
        FROM public.establishments
        ORDER BY id;
    '''
    establishments: Dict[str, DbEstablishment] = {}
    try:
        with psycopg2.connect(**db_config.__dict__) as conn, conn.cursor() as cur:
            cur.execute(query)
            for row in cur.fetchall():
                est = DbEstablishment(
                    id=row[0],
                    siren=row[1],
                    deleted_at=row[2].isoformat() if row[2] else None,
                    suspended_at=row[3].isoformat() if row[3] else None,
                    suspended_cause=row[4],
                )
                establishments[est.id] = est
        logger.info(f'Establishments fetched: {len(establishments)}')
    except psycopg2.Error as e:
        logger.error(f'PostgreSQL error while fetching establishments: {e}')
    
    return establishments

# ---------------------------------------------------------------------------
# Step 3 : business logic
# ---------------------------------------------------------------------------

def date_in_past(date_str: str) -> bool:
    """Return True if ISO date is strictly in the past (TZ-aware)."""
    try:
        dt = dateutil.parser.isoparse(date_str)
        now = datetime.now(tz=dt.tzinfo or timezone.utc)
        return dt < now
    except Exception:
        # Parse error ⇒ treat as not expired
        return False

def analyze_establishment_status(
    est: DbEstablishment,
    struct_file: Optional[StructureFileRecord],
    now_iso: str,
) -> Optional[Action]:
    """
    Decide whether an establishment must be suspended.
    
    Note: This function no longer handles deletion logic.
    Missing SIRENs from the JSONL file are ignored.
    """
    # If SIREN is missing from file, we do nothing (no deletion)
    if struct_file is None:
        return None

    # Rule : acces_lovac is NULL or expired → suspend
    lovac = struct_file.acces_lovac
    if lovac is None or date_in_past(lovac):
        # Only suspend if not already suspended
        if est.suspended_at is None:
            return Action(establishment_id=est.id,
                          action_type='suspend',
                          executed_at=now_iso,
                          suspended_cause='droits structure expires')
    return None

# ---------------------------------------------------------------------------
# Step 4 : apply actions
# ---------------------------------------------------------------------------

def apply_actions(actions: List[Action], db_config: DatabaseConfig, dry_run: bool = False) -> None:
    """Persist updates to the database (or print them if dry_run=True)."""
    if not actions:
        logger.info('No update needed')
        return

    if dry_run:
        logger.info(f'DRY RUN — {len(actions)} updates to perform:')
        for a in actions:
            logger.info(f'  SUSPEND → {a.establishment_id} ({a.suspended_cause})')
        return

    try:
        with psycopg2.connect(**db_config.__dict__) as conn, conn.cursor() as cur:
            for a in actions:
                # Only handle suspension (no deletion)
                cur.execute(
                    'UPDATE public.establishments '
                    'SET suspended_at = %s, suspended_cause = %s '
                    'WHERE id = %s '
                    '  AND deleted_at IS NULL '
                    '  AND suspended_at IS NULL',
                    (a.executed_at, a.suspended_cause, a.establishment_id),
                )
            conn.commit()
        logger.info(f'Updates applied: {len(actions)}')
    except psycopg2.Error as e:
        logger.error(f'PostgreSQL error while applying actions: {e}')

# ---------------------------------------------------------------------------
# Step 5 : orchestration
# ---------------------------------------------------------------------------

def run_verification(
    jsonl_file: str,
    db_config: DatabaseConfig,
    dry_run: bool = False
) -> None:
    """Main verification function."""
    logger.info("=== STRUCTURE RIGHTS CHECK ===")
    
    if not check_establishments_schema(db_config):
        logger.error("Schema validation failed")
        return

    structures = load_structures(jsonl_file)
    if not structures:
        logger.error("No structures loaded from file")
        return
    
    establishments = fetch_establishments(db_config)
    if not establishments:
        logger.error("No establishments found in database")
        return

    actions: List[Action] = []
    now_iso = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()

    for est in establishments.values():
        siren_str = f'{est.siren:09d}' if est.siren is not None else None
        struct_file = structures.get(siren_str) if siren_str else None
        action = analyze_establishment_status(est, struct_file, now_iso)
        if action:
            actions.append(action)

    apply_actions(actions, db_config, dry_run)

# ---------------------------------------------------------------------------
# CLI Interface with Click
# ---------------------------------------------------------------------------

@click.command()
@click.option(
    '--jsonl-file', '-f',
    default='structures.jsonl',
    type=click.Path(exists=True, readable=True),
    help='Path to the JSON Lines structures file (default: structures.jsonl)'
)
@click.option(
    '--db-host', '-h',
    default='localhost',
    envvar='DB_HOST',
    help='Database host (default: localhost, env: DB_HOST)'
)
@click.option(
    '--db-port', '-p',
    default=5432,
    type=int,
    envvar='DB_PORT',
    help='Database port (default: 5432, env: DB_PORT)'
)
@click.option(
    '--db-name', '-d',
    required=True,
    envvar='DB_NAME',
    help='Database name (required, env: DB_NAME)'
)
@click.option(
    '--db-user', '-u',
    required=True,
    envvar='DB_USER',
    help='Database user (required, env: DB_USER)'
)
@click.option(
    '--db-password', '-w',
    required=True,
    envvar='DB_PASSWORD',
    help='Database password (required, env: DB_PASSWORD)'
)
@click.option(
    '--dry-run',
    is_flag=True,
    help='Show what would be done without making changes'
)
@click.option(
    '--verbose', '-v',
    is_flag=True,
    help='Enable verbose logging'
)
@click.version_option(version='1.0.0')
def main(jsonl_file, db_host, db_port, db_name, db_user, db_password, dry_run, verbose):
    """
    Verify structure permissions against establishments database.
    
    This tool checks structure permissions by comparing SIREN data from a JSONL
    file with establishments in the database. It suspends establishments based
    on expired access rights.
    
    Business Rule:
    - Expired or null LOVAC access → suspend establishment
    
    Note: This script does NOT mark establishments as deleted,
    even if their SIREN is missing from the JSONL file.
    
    Examples:
    
    \b
    # Basic usage with environment variables
    export DB_NAME="mydb" DB_USER="user" DB_PASSWORD="pass"
    python structure-verifier.py
    
    \b
    # Custom database connection
    python structure-verifier.py --db-host db.example.com --db-port 5433
    
    \b
    # Dry run to see what would be changed
    python structure-verifier.py --dry-run
    
    \b
    # Verbose output
    python structure-verifier.py --verbose
    """
    
    # Configure log level
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Create database configuration
        db_config = DatabaseConfig(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        # Run verification
        run_verification(jsonl_file, db_config, dry_run)
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()