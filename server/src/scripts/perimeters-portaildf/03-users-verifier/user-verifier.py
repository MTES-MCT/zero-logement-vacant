#!/usr/bin/env python3
"""
Script to automatically suspend users according to business rules:
- suspended_at if rights expired, structure expired, or invalid ToS

Modern configuration with CLI, environment variables and validation.
"""

import psycopg2
import json
import sys
from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import dateutil.parser
import logging
import click

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('user_deactivation.log')
    ]
)
logger = logging.getLogger(__name__)

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

@dataclass
class ApiUser:
    """Represents an API user."""
    id_user: int
    email: str
    attachment_date: Optional[str]
    structure: Optional[int]
    expiration_date: Optional[str]
    external: bool
    manager: bool
    group: Optional[int]
    valid_tos: Optional[str]  # Terms of Service
    representative_structure: Optional[str]

@dataclass
class DatabaseUser:
    """Represents a database user."""
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    establishment_id: Optional[int]
    deleted_at: Optional[str]
    suspended_at: Optional[str]
    suspended_cause: Optional[str]

@dataclass
class DeactivationAction:
    """Represents a suspension or reactivation action to perform."""
    user_id: int
    email: str
    action_type: str  # 'suspend' or 'reactivate'
    reasons: List[str]
    suspended_at: Optional[str] = None
    suspended_cause: Optional[str] = None

@dataclass
class Structure:
    """Represents a structure from the structures.jsonl file."""
    id_structure: int
    siret: Optional[str]
    acces_lovac: Optional[str]
    
    @property
    def siren(self) -> Optional[str]:
        """Extract SIREN from SIRET (first 9 digits)."""
        if self.siret and len(self.siret) >= 9:
            return self.siret[:9]
        return None

def load_api_users(jsonl_file: str) -> Dict[str, ApiUser]:
    """
    Load all users from the API JSON Lines file.
    
    Args:
        jsonl_file: Path to the JSON Lines file
        
    Returns:
        Dict[str, ApiUser]: Dictionary with email as key
    """
    api_users = {}
    
    if not Path(jsonl_file).exists():
        logger.error(f"JSON Lines file not found: {jsonl_file}")
        return api_users
    
    try:
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    user_data = json.loads(line)
                    email = user_data.get('email')
                    if email:
                        normalized_email = email.lower().strip()
                        
                        api_user = ApiUser(
                            id_user=user_data.get('id_user'),
                            email=email,
                            attachment_date=user_data.get('date_rattachement'),
                            structure=user_data.get('structure'),
                            expiration_date=user_data.get('date_expiration'),
                            external=user_data.get('exterieur', False),
                            manager=user_data.get('gestionnaire', False),
                            group=user_data.get('groupe'),
                            valid_tos=user_data.get('cgu_valide'),
                            representative_structure=user_data.get('str_mandataire')
                        )
                        
                        api_users[normalized_email] = api_user
                        
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid line {line_num} in {jsonl_file}: {e}")
                    
        logger.info(f"Users loaded from API: {len(api_users)}")
        
    except IOError as e:
        logger.error(f"Error reading {jsonl_file}: {e}")
    
    return api_users

def load_structures(jsonl_file: str) -> Dict[int, Structure]:
    """
    Load all structures from the structures JSON Lines file.
    
    Args:
        jsonl_file: Path to the structures JSON Lines file
        
    Returns:
        Dict[int, Structure]: Dictionary with structure ID as key
    """
    structures = {}
    
    if not Path(jsonl_file).exists():
        logger.error(f"Structures file not found: {jsonl_file}")
        return structures
    
    try:
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    structure_data = json.loads(line)
                    structure_id = structure_data.get('id') or structure_data.get('id_structure')
                    
                    if structure_id:
                        structure = Structure(
                            id_structure=structure_id,
                            siret=structure_data.get('siret'),
                            acces_lovac=structure_data.get('acces_lovac')
                        )
                        structures[structure_id] = structure
                        
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid line {line_num} in structures file: {e}")
                    
        logger.info(f"Structures loaded: {len(structures)}")
        
    except IOError as e:
        logger.error(f"Error reading structures file: {e}")
    
    return structures

def check_database_schema(db_config: DatabaseConfig) -> bool:
    """
    Verify that necessary columns exist in the users table.
    
    Args:
        db_config: Database configuration
        
    Returns:
        bool: True if schema is valid
    """
    try:
        with psycopg2.connect(**db_config.__dict__) as conn:
            with conn.cursor() as cursor:
                # Check existing columns
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND table_schema = 'public'
                    ORDER BY column_name;
                """)
                
                existing_columns = [row[0] for row in cursor.fetchall()]
                required_columns = ['suspended_at', 'suspended_cause']
                missing_columns = [col for col in required_columns if col not in existing_columns]
                
                logger.info(f"Existing columns in 'users': {', '.join(existing_columns)}")
                
                if missing_columns:
                    logger.error(f"Missing columns: {', '.join(missing_columns)}")
                    logger.info("You must apply the Knex migration: npx knex migrate:latest")
                    return False
                
                logger.info("All necessary columns are present")
                return True
        
    except psycopg2.Error as e:
        logger.error(f"Error checking database schema: {e}")
        return False

def get_database_users(db_config: DatabaseConfig) -> Dict[str, DatabaseUser]:
    """
    Retrieve all users from the PostgreSQL database.
    
    Args:
        db_config: Database configuration
        
    Returns:
        Dict[str, DatabaseUser]: Dictionary with email as key
    """
    users = {}
    
    # Check schema first
    if not check_database_schema(db_config):
        return {}
    
    query = """
    SELECT 
        id,
        email,
        first_name,
        last_name,
        establishment_id,
        deleted_at,
        suspended_at,
        suspended_cause
    FROM users 
    WHERE email IS NOT NULL 
    AND email != ''
    ORDER BY email;
    """
    
    try:
        logger.info("Connecting to PostgreSQL database...")
        with psycopg2.connect(**db_config.__dict__) as conn:
            with conn.cursor() as cursor:
                logger.info("Retrieving users from database...")
                cursor.execute(query)
                
                rows = cursor.fetchall()
                
                for row in rows:
                    user_id, email, first_name, last_name, establishment_id, deleted_at, suspended_at, suspended_cause = row
                    normalized_email = email.lower().strip()
                    
                    users[normalized_email] = DatabaseUser(
                        id=user_id,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        establishment_id=establishment_id,
                        deleted_at=deleted_at.isoformat() if deleted_at else None,
                        suspended_at=suspended_at.isoformat() if suspended_at else None,
                        suspended_cause=suspended_cause
                    )
                
                logger.info(f"Users retrieved from database: {len(users)}")
        
    except psycopg2.Error as e:
        logger.error(f"PostgreSQL error: {e}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {}
    finally:
        logger.info("Database connection closed")
    
    return users

def check_structure_access(structure_id: int, structures: Dict[int, Structure]) -> Optional[bool]:
    """
    Check if the structure has valid LOVAC access using local data.
    
    Args:
        structure_id: ID of the structure to check
        structures: Dictionary of loaded structures
        
    Returns:
        bool: True if access is valid, False otherwise, None if structure not found
    """
    if not structure_id:
        return None
    
    structure = structures.get(structure_id)
    if not structure:
        logger.warning(f"Structure {structure_id} not found in structures file")
        return None
    
    lovac_access = structure.acces_lovac
    if not lovac_access:
        logger.info(f"Structure {structure_id}: no LOVAC access defined")
        return False
    
    # Check if LOVAC access is in the future
    try:
        access_date = dateutil.parser.parse(lovac_access.replace('Z', '+00:00'))
        access_date = access_date.replace(tzinfo=None)
        now = datetime.now()
        
        is_valid = access_date > now
        status = "valid" if is_valid else "expired"
        logger.info(f"Structure {structure_id}: LOVAC access {status} ({lovac_access})")
        
        return is_valid
        
    except Exception as date_error:
        logger.warning(f"Invalid LOVAC date for structure {structure_id}: {date_error}")
        return False

def analyze_user_status(
    db_user: DatabaseUser, 
    api_user: Optional[ApiUser],
    structures: Dict[int, Structure]
) -> Optional[DeactivationAction]:
    """
    Analyze user status and determine actions to perform.
    
    Args:
        db_user: Database user
        api_user: API user (None if absent)
        structures: Dictionary of loaded structures
        
    Returns:
        DeactivationAction or None if no action needed
    """
    now = datetime.now()
    reasons = []
    
    # Skip if user not in API (no deletion rule anymore)
    if api_user is None:
        return None
    
    # If user is already deleted, do nothing
    if db_user.deleted_at is not None:
        return None
    
    # Check suspension conditions
    
    # Rule 1: Expiration date in the past
    if api_user.expiration_date:
        try:
            exp_date = dateutil.parser.parse(api_user.expiration_date.replace('Z', '+00:00'))
            exp_date = exp_date.replace(tzinfo=None)
            
            if exp_date < now:
                reasons.append("droits utilisateur expires")
        except Exception:
            reasons.append("invalid expiration date")
    
    # Rule 2: Invalid Terms of Service
    if api_user.valid_tos is None:
        reasons.append("cgu vides")
    
    # Rule 3: Expired structure rights
    if api_user.structure:
        logger.info(f"Checking structure {api_user.structure} for {db_user.email}...")
        structure_access_valid = check_structure_access(api_user.structure, structures)
        
        if structure_access_valid is False:
            reasons.append("droits structure expires")
        elif structure_access_valid is None:
            logger.warning(f"Structure {api_user.structure} not found in structures file")
            # Optional: add suspension reason for missing structures
            # reasons.append("structure not found")
    
    # If suspension reasons exist
    if reasons:
        return DeactivationAction(
            user_id=db_user.id,
            email=db_user.email,
            action_type='suspend',
            reasons=reasons,
            suspended_at=now.isoformat(),
            suspended_cause=", ".join(reasons)
        )

    # If user is currently suspended but no longer has suspension reasons, reactivate
    if db_user.suspended_at is not None and not reasons:
        return DeactivationAction(
            user_id=db_user.id,
            email=db_user.email,
            action_type='reactivate',
            reasons=['suspension criteria no longer met'],
            suspended_at=None,
            suspended_cause=None
        )

    return None

def apply_deactivation_actions(actions: List[DeactivationAction], db_config: DatabaseConfig, dry_run: bool = False) -> None:
    """
    Apply suspension actions to the database.
    
    Args:
        actions: List of actions to perform
        db_config: Database configuration
        dry_run: If True, only show what would be done
    """
    if not actions:
        logger.info("No actions to perform")
        return
    
    if dry_run:
        logger.info(f"DRY RUN MODE - {len(actions)} actions would be performed:")
        for action in actions:
            if action.action_type == 'suspend':
                logger.info(f"  SUSPEND: {action.email} - {action.suspended_cause}")
            elif action.action_type == 'reactivate':
                logger.info(f"  REACTIVATE: {action.email}")
        return
    
    try:
        with psycopg2.connect(**db_config.__dict__) as conn:
            with conn.cursor() as cursor:
                # Process suspensions
                suspend_query = """
                UPDATE users
                SET suspended_at = %s, suspended_cause = %s
                WHERE id = %s AND deleted_at IS NULL
                """

                # Process reactivations
                reactivate_query = """
                UPDATE users
                SET suspended_at = NULL, suspended_cause = NULL
                WHERE id = %s AND deleted_at IS NULL
                """

                suspended_count = 0
                reactivated_count = 0

                for action in actions:
                    if action.action_type == 'suspend':
                        cursor.execute(suspend_query, (
                            action.suspended_at,
                            action.suspended_cause,
                            action.user_id
                        ))
                        suspended_count += 1
                    elif action.action_type == 'reactivate':
                        cursor.execute(reactivate_query, (action.user_id,))
                        reactivated_count += 1

                if suspended_count > 0:
                    logger.info(f"{suspended_count} users suspended")
                if reactivated_count > 0:
                    logger.info(f"{reactivated_count} users reactivated")

                conn.commit()
                logger.info("All changes have been applied")
        
    except psycopg2.Error as e:
        logger.error(f"PostgreSQL error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise

def generate_report(actions: List[DeactivationAction]) -> None:
    """
    Generate a report of performed actions.

    Args:
        actions: List of actions performed
    """
    if not actions:
        return

    suspended = [a for a in actions if a.action_type == 'suspend']
    reactivated = [a for a in actions if a.action_type == 'reactivate']

    logger.info(f"=== ACTION REPORT ===")
    logger.info(f"Users suspended: {len(suspended)}")
    logger.info(f"Users reactivated: {len(reactivated)}")
    logger.info(f"Total actions: {len(actions)}")

    if suspended:
        # Analyze suspension reasons
        reason_counts = {}
        for action in suspended:
            for reason in action.reasons:
                reason_counts[reason] = reason_counts.get(reason, 0) + 1

        logger.info(f"=== SUSPENSION REASONS ===")
        for reason, count in sorted(reason_counts.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {reason}: {count} users")

    if reactivated:
        logger.info(f"=== REACTIVATED USERS ===")
        for action in reactivated:
            logger.info(f"  {action.email}")

def run_deactivation(
    users_file: str,
    structures_file: str,
    db_config: DatabaseConfig,
    dry_run: bool = False
) -> None:
    """
    Main suspension function.
    
    Args:
        users_file: Path to users JSON Lines file
        structures_file: Path to structures JSON Lines file
        db_config: Database configuration
        dry_run: If True, only show what would be done
    """
    logger.info("=== AUTOMATIC USER SUSPENSION SCRIPT ===")
    
    try:
        # 1. Load API users
        logger.info("Step 1: Loading users from API...")
        api_users = load_api_users(users_file)
        
        # 2. Load structures
        logger.info("Step 2: Loading structures...")
        structures = load_structures(structures_file)
        
        # 3. Load database users
        logger.info("Step 3: Retrieving users from database...")
        db_users = get_database_users(db_config)
        
        if not db_users:
            logger.error("No users in database. Stopping script.")
            return
        
        # 4. Analyze each user
        logger.info(f"Step 4: Analyzing {len(db_users)} users...")
        actions = []
        
        for email, db_user in db_users.items():
            api_user = api_users.get(email)
            action = analyze_user_status(db_user, api_user, structures)
            
            if action:
                actions.append(action)
        
        # 5. Apply actions
        logger.info(f"Step 5: Applying actions...")
        apply_deactivation_actions(actions, db_config, dry_run)
        
        # 6. Generate report
        generate_report(actions)
        
        logger.info(f"=== PROCESSING COMPLETED ===")
        
        if dry_run:
            logger.info("To apply changes, run without --dry-run flag")
        
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise

# CLI Interface with Click
@click.command()
@click.option(
    '--users-file', '-u',
    default='users.jsonl',
    type=click.Path(exists=True, readable=True),
    help='Path to JSON Lines users file (default: users.jsonl)'
)
@click.option(
    '--structures-file', '-s',
    default='structures.jsonl',
    type=click.Path(exists=True, readable=True),
    help='Path to JSON Lines structures file (default: structures.jsonl)'
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
    '--db-user', '-U',
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
@click.version_option(version='2.2.0')
def main(users_file, structures_file, db_host, db_port, db_name, db_user, db_password, 
         dry_run, verbose):
    """
    Automatically suspend users according to business rules.
    
    This script compares users from a JSON Lines file with users in the database
    and applies suspension rules based on expiration dates and structure access 
    rights from a local structures file.
    
    Business Rules:
    1. droits utilisateur expires → suspend user
    2. cgu vides → suspend user
    3. droits structure expires → suspend user
    
    Note: Users absent from JSON Lines are NO LONGER marked as deleted.
    
    Examples:
    
    \b
    # Basic usage with environment variables
    export DB_NAME="mydb" DB_USER="user" DB_PASSWORD="pass"
    python users-verifier.py
    
    \b
    # Dry run to preview changes
    python users-verifier.py --dry-run
    
    \b
    # Custom files and database settings
    python users-verifier.py --users-file my_users.jsonl --structures-file my_structures.jsonl
    
    \b
    # Verbose output
    python users-verifier.py --verbose
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
        
        # Test database connection
        logger.info("Testing database connection...")
        try:
            with psycopg2.connect(**db_config.__dict__) as conn:
                pass
            logger.info("Database connection successful")
        except psycopg2.Error as e:
            logger.error(f"Unable to connect to database: {e}")
            sys.exit(1)
        
        # Run deactivation
        run_deactivation(users_file, structures_file, db_config, dry_run)
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()