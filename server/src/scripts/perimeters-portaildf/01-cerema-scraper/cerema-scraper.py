#!/usr/bin/env python3
"""
Script to retrieve structures and users from the Cerema DF Portal API
and save them to JSON Lines files with automatic resume capability.

Modern configuration with CLI, environment variables and validation.
"""

import requests
import json
import time
import os
import sys
from typing import Optional, Set
from dataclasses import dataclass
from pathlib import Path
import click
from urllib.parse import urlparse, urljoin
import logging
from enum import Enum

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('api_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

class DataType(Enum):
    """Supported data types for scraping."""
    STRUCTURES = "structures"
    USERS = "users"

@dataclass
class ScriptState:
    """Script state for resume capability."""
    last_completed_page: int = 0
    next_url: Optional[str] = None
    total_items_processed: int = 0
    existing_item_ids: Set[int] = None
    data_type: str = DataType.STRUCTURES.value
    
    def __post_init__(self):
        if self.existing_item_ids is None:
            self.existing_item_ids = set()

@dataclass
class Config:
    """Script configuration."""
    bearer_token: str
    base_url: str
    structures_output: str
    users_output: str
    structures_state_file: str
    users_state_file: str
    delay_between_requests: float
    max_retries: int
    retry_delay: float
    verbose: bool = False
    
    def __post_init__(self):
        """Configuration validation."""
        if not self.bearer_token or self.bearer_token == "xxx":
            raise ValueError("Valid Bearer token required")
        
        parsed_url = urlparse(self.base_url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError(f"Invalid base URL: {self.base_url}")
        
        if self.delay_between_requests < 0:
            raise ValueError("Delay between requests must be positive")
        
        if self.max_retries < 1:
            raise ValueError("Maximum retries must be >= 1")
        
        if self.retry_delay < 0:
            raise ValueError("Retry delay must be positive")

def get_headers(token: str) -> dict:
    """Returns HTTP headers with authentication token."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Python API Client - Cerema Scraper/2.0"
    }

def get_endpoint_url(base_url: str, data_type: DataType) -> str:
    """Get the appropriate endpoint URL for the data type."""
    if data_type == DataType.STRUCTURES:
        return urljoin(base_url.rstrip('/') + '/', 'structures')
    elif data_type == DataType.USERS:
        return urljoin(base_url.rstrip('/') + '/', 'utilisateurs')
    else:
        raise ValueError(f"Unknown data type: {data_type}")

def load_state(state_file: str, data_type: DataType) -> ScriptState:
    """
    Load previous state from backup file.
    
    Args:
        state_file: Path to state file
        data_type: Type of data being processed
        
    Returns:
        ScriptState: Loaded state or new state if file doesn't exist
    """
    if not os.path.exists(state_file):
        return ScriptState(data_type=data_type.value)
    
    try:
        with open(state_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            existing_ids = set(data.get('existing_item_ids', []))
            return ScriptState(
                last_completed_page=data.get('last_completed_page', 0),
                next_url=data.get('next_url'),
                total_items_processed=data.get('total_items_processed', 0),
                existing_item_ids=existing_ids,
                data_type=data.get('data_type', data_type.value)
            )
    except (json.JSONDecodeError, KeyError) as e:
        logger.warning(f"Error loading state: {e}")
        logger.info("Starting from the beginning...")
        return ScriptState(data_type=data_type.value)

def save_state(state: ScriptState, state_file: str):
    """
    Save current state to backup file.
    
    Args:
        state: State to save
        state_file: Path to state file
    """
    try:
        state_dict = {
            'last_completed_page': state.last_completed_page,
            'next_url': state.next_url,
            'total_items_processed': state.total_items_processed,
            'existing_item_ids': list(state.existing_item_ids),
            'data_type': state.data_type
        }
        
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(state_dict, f, indent=2, ensure_ascii=False)
    except IOError as e:
        logger.error(f"Error saving state: {e}")

def load_existing_item_ids(filename: str, data_type: DataType) -> Set[int]:
    """
    Load IDs of items already present in the JSON Lines file.
    
    Args:
        filename: Name of the JSON Lines file
        data_type: Type of data to determine ID field
        
    Returns:
        Set[int]: Set of existing item IDs
    """
    existing_ids = set()
    
    if not os.path.exists(filename):
        return existing_ids
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                    if data_type == DataType.STRUCTURES:
                        item_id = item.get('id') or item.get('id_structure')
                    elif data_type == DataType.USERS:
                        # Try multiple possible ID fields for users including id_user
                        item_id = (item.get('id') or 
                                 item.get('id_utilisateur') or 
                                 item.get('id_user') or 
                                 item.get('user_id') or 
                                 item.get('pk'))
                    else:
                        continue
                    
                    if item_id:
                        existing_ids.add(item_id)
                        
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid line {line_num} in {filename}: {e}")
    except IOError as e:
        logger.error(f"Error reading {filename}: {e}")
    
    return existing_ids

def fetch_page_with_retry(url: str, config: Config) -> Optional[dict]:
    """
    Fetch page data from API with retry mechanism.
    
    Args:
        url: URL of the page to fetch
        config: Script configuration
        
    Returns:
        dict: JSON response data or None on definitive failure
    """
    for attempt in range(1, config.max_retries + 1):
        try:
            logger.info(f"Attempt {attempt}/{config.max_retries}...")
            response = requests.get(url, headers=get_headers(config.bearer_token), timeout=60)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout on attempt {attempt}")
            if attempt < config.max_retries:
                logger.info(f"Waiting {config.retry_delay} seconds before retry...")
                time.sleep(config.retry_delay)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error on attempt {attempt}: {e}")
            if attempt < config.max_retries:
                logger.info(f"Waiting {config.retry_delay} seconds before retry...")
                time.sleep(config.retry_delay)
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            break
    
    logger.error(f"Definitive failure after {config.max_retries} attempts")
    return None

def save_new_items_to_jsonl(items: list, existing_ids: Set[int], filename: str, data_type: DataType) -> int:
    """
    Save only new items to a JSON Lines file.
    
    Args:
        items: List of items to process
        existing_ids: Set of already existing IDs
        filename: Output filename
        data_type: Type of data being processed
        
    Returns:
        int: Number of new items saved
    """
    new_items_count = 0
    
    try:
        with open(filename, 'a', encoding='utf-8') as f:
            for item in items:
                if data_type == DataType.STRUCTURES:
                    item_id = item.get('id') or item.get('id_structure')
                elif data_type == DataType.USERS:
                    # Try multiple possible ID fields for users including id_user
                    item_id = (item.get('id') or 
                             item.get('id_utilisateur') or 
                             item.get('id_user') or 
                             item.get('user_id') or 
                             item.get('pk'))
                else:
                    continue
                
                # Debug logging for the first few items
                if new_items_count < 3:
                    logger.debug(f"Processing {data_type.value} item: ID={item_id}, keys={list(item.keys())[:10]}")
                
                if item_id and item_id not in existing_ids:
                    json.dump(item, f, ensure_ascii=False)
                    f.write('\n')
                    existing_ids.add(item_id)
                    new_items_count += 1
                elif item_id:
                    # Item already exists
                    if new_items_count < 3:
                        logger.debug(f"Skipping existing {data_type.value} ID: {item_id}")
                else:
                    # No ID found - this is the problem!
                    if new_items_count < 5:  # Log first few problematic items
                        logger.warning(f"No ID found for {data_type.value} item with keys: {list(item.keys())}")
                        logger.debug(f"Item content: {json.dumps(item, ensure_ascii=False)[:200]}...")
                    
    except IOError as e:
        logger.error(f"Error writing to file {filename}: {e}")
    
    return new_items_count

def cleanup_state_file(state_file: str):
    """Remove state file at the end of processing."""
    try:
        if os.path.exists(state_file):
            os.remove(state_file)
            logger.info(f"State file {state_file} removed")
    except OSError as e:
        logger.warning(f"Cannot remove state file: {e}")

def analyze_structures(filename: str):
    """
    Analyze retrieved structures and display statistics.
    
    Args:
        filename: Name of the JSON Lines structures file
    """
    if not os.path.exists(filename):
        return
    
    structure_types = {}
    with_acces_lovac = 0
    without_acces_lovac = 0
    total_structures = 0
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    structure = json.loads(line)
                    total_structures += 1
                    
                    struct_type = structure.get('type', 'Unknown')
                    structure_types[struct_type] = structure_types.get(struct_type, 0) + 1
                    
                    if structure.get('acces_lovac'):
                        with_acces_lovac += 1
                    else:
                        without_acces_lovac += 1
                        
                except json.JSONDecodeError:
                    continue
        
        logger.info(f"=== STRUCTURE ANALYSIS ===")
        logger.info(f"Total structures: {total_structures}")
        logger.info(f"With LOVAC access: {with_acces_lovac}")
        logger.info(f"Without LOVAC access: {without_acces_lovac}")
        
        if structure_types:
            logger.info(f"=== DISTRIBUTION BY TYPE ===")
            for struct_type, count in sorted(structure_types.items(), key=lambda x: x[1], reverse=True):
                logger.info(f"  {struct_type}: {count} structures")
                
    except IOError as e:
        logger.error(f"Error during analysis: {e}")

def analyze_users(filename: str):
    """
    Analyze retrieved users and display statistics.
    
    Args:
        filename: Name of the JSON Lines users file
    """
    if not os.path.exists(filename):
        logger.warning(f"Users file {filename} does not exist")
        return
    
    user_roles = {}
    active_users = 0
    inactive_users = 0
    total_users = 0
    id_fields_found = set()
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    user = json.loads(line)
                    total_users += 1
                    
                    # Track what ID fields are actually present
                    for id_field in ['id', 'id_utilisateur', 'id_user', 'user_id', 'pk']:
                        if id_field in user:
                            id_fields_found.add(id_field)
                    
                    # Analyze user roles/groups
                    role = user.get('role', user.get('groupe', user.get('type', 'Unknown')))
                    user_roles[role] = user_roles.get(role, 0) + 1
                    
                    # Analyze user status
                    if user.get('is_active', user.get('active', True)):
                        active_users += 1
                    else:
                        inactive_users += 1
                        
                except json.JSONDecodeError:
                    continue
        
        logger.info(f"=== USER ANALYSIS ===")
        logger.info(f"Total users: {total_users}")
        if total_users > 0:
            logger.info(f"Active users: {active_users}")
            logger.info(f"Inactive users: {inactive_users}")
            logger.info(f"ID fields found: {', '.join(sorted(id_fields_found))}")
            
            if user_roles:
                logger.info(f"=== DISTRIBUTION BY ROLE/GROUP ===")
                for role, count in sorted(user_roles.items(), key=lambda x: x[1], reverse=True):
                    logger.info(f"  {role}: {count} users")
        else:
            logger.warning("No users found in file - this may indicate an ID field detection issue")
                
    except IOError as e:
        logger.error(f"Error during analysis: {e}")

def run_scraper_for_type(config: Config, data_type: DataType):
    """
    Run scraper for a specific data type.
    
    Args:
        config: Script configuration
        data_type: Type of data to scrape
    """
    type_name = data_type.value
    logger.info(f"Starting {type_name} retrieval...")
    
    # Determine output file and state file
    if data_type == DataType.STRUCTURES:
        output_file = config.structures_output
        state_file = config.structures_state_file
    elif data_type == DataType.USERS:
        output_file = config.users_output
        state_file = config.users_state_file
    else:
        logger.error(f"Unknown data type: {data_type}")
        return
    
    # Load previous state
    state = load_state(state_file, data_type)
    
    # Initialize next_url if necessary
    if state.next_url is None:
        state.next_url = get_endpoint_url(config.base_url, data_type)
    
    # If resuming, load existing IDs from file
    if state.last_completed_page > 0:
        logger.info(f"Resuming from page {state.last_completed_page + 1}")
        logger.info(f"{state.total_items_processed} {type_name} already processed")
        if not state.existing_item_ids:
            logger.info(f"Reading existing {type_name}...")
            state.existing_item_ids = load_existing_item_ids(output_file, data_type)
    else:
        logger.info(f"New {type_name} processing session")
        Path(output_file).touch()
        state.existing_item_ids = set()
    
    current_url = state.next_url
    page_number = state.last_completed_page + 1
    
    try:
        while current_url:
            logger.info(f"Processing {type_name} page {page_number}...")
            
            # Fetch current page data with retry
            data = fetch_page_with_retry(current_url, config)
            
            if data is None:
                logger.error(f"Definitive failure retrieving {type_name} page {page_number}")
                logger.info("Saving state for later resume...")
                save_state(state, state_file)
                return
            
            # Extract items
            items = data.get('results', [])
            if items:
                new_items_count = save_new_items_to_jsonl(
                    items, state.existing_item_ids, output_file, data_type
                )
                state.total_items_processed += len(items)
                
                if new_items_count > 0:
                    logger.info(f"Page {page_number}: {new_items_count} new {type_name} saved ({len(items)} total)")
                else:
                    logger.info(f"Page {page_number}: No new {type_name} (all already present)")
            else:
                logger.warning(f"Page {page_number}: No {type_name} found")
            
            # Update state
            state.last_completed_page = page_number
            state.next_url = data.get('next')
            
            # Display statistics
            total_count = data.get('count', 0)
            unique_items = len(state.existing_item_ids)
            logger.info(f"Progress: {state.total_items_processed}/{total_count} {type_name} processed")
            logger.info(f"Unique {type_name}: {unique_items}")
            
            # Save state periodically
            save_state(state, state_file)
            
            # Prepare next page
            current_url = state.next_url
            
            if current_url:
                page_number += 1
                time.sleep(config.delay_between_requests)
            else:
                logger.info(f"Last {type_name} page reached")
        
        logger.info(f"{type_name.title()} retrieval completed successfully!")
        logger.info(f"Output file: {output_file}")
        logger.info(f"Total unique {type_name}: {len(state.existing_item_ids)}")
        logger.info(f"Pages processed: {state.last_completed_page}")
        
        # Analyze retrieved data
        if data_type == DataType.STRUCTURES:
            analyze_structures(output_file)
        elif data_type == DataType.USERS:
            analyze_users(output_file)
        
        # Clean up state file
        cleanup_state_file(state_file)
        
    except KeyboardInterrupt:
        logger.info("User interruption")
        logger.info("Saving state for later resume...")
        save_state(state, state_file)
        logger.info("To resume, simply run the script again")

def run_scraper(config: Config, data_types: list):
    """
    Main function that orchestrates data retrieval for multiple data types.
    
    Args:
        config: Script configuration
        data_types: List of data types to scrape
    """
    for data_type in data_types:
        run_scraper_for_type(config, data_type)
        if len(data_types) > 1:
            logger.info(f"Waiting {config.delay_between_requests} seconds before next data type...")
            time.sleep(config.delay_between_requests)

# CLI Interface with Click
@click.command()
@click.option(
    '--token', '-t',
    envvar='CEREMA_BEARER_TOKEN',
    required=True,
    help='Bearer token for API authentication (can be set via CEREMA_BEARER_TOKEN)'
)
@click.option(
    '--base-url', '-u',
    default='https://portaildf.cerema.fr/api',
    envvar='CEREMA_BASE_URL',
    help='Base API URL (default: https://portaildf.cerema.fr/api)'
)
@click.option(
    '--structures-output',
    default='structures.jsonl',
    type=click.Path(),
    help='Structures JSON Lines output file (default: structures.jsonl)'
)
@click.option(
    '--users-output',
    default='users.jsonl',
    type=click.Path(),
    help='Users JSON Lines output file (default: users.jsonl)'
)
@click.option(
    '--structures-state-file',
    default='api_structures_state.json',
    type=click.Path(),
    help='Structures state file for resume (default: api_structures_state.json)'
)
@click.option(
    '--users-state-file',
    default='api_users_state.json',
    type=click.Path(),
    help='Users state file for resume (default: api_users_state.json)'
)
@click.option(
    '--delay',
    default=0.5,
    type=float,
    help='Delay between requests in seconds (default: 0.5)'
)
@click.option(
    '--max-retries',
    default=3,
    type=int,
    help='Maximum number of retries per page (default: 3)'
)
@click.option(
    '--retry-delay',
    default=5.0,
    type=float,
    help='Delay between retries in seconds (default: 5.0)'
)
@click.option(
    '--verbose', '-v',
    is_flag=True,
    help='Verbose mode with detailed logs'
)
@click.option(
    '--reset-state',
    is_flag=True,
    help='Remove state files and restart from beginning'
)
@click.option(
    '--structures-only',
    is_flag=True,
    help='Only scrape structures (skip users)'
)
@click.option(
    '--users-only',
    is_flag=True,
    help='Only scrape users (skip structures)'
)
@click.version_option(version='2.1.0')
def main(token, base_url, structures_output, users_output, structures_state_file, users_state_file, 
         delay, max_retries, retry_delay, verbose, reset_state, structures_only, users_only):
    """
    Script to retrieve structures and users from the Cerema DF Portal API.
    
    The script supports automatic resume on interruption and avoids
    duplicates by checking existing IDs. Can scrape both structures
    and users, or either one individually.
    
    Usage examples:
    
    \b
    # Scrape both structures and users
    export CEREMA_BEARER_TOKEN="your_token_here"
    python cerema-scraper.py
    
    \b
    # Scrape only structures
    python cerema-scraper.py --structures-only
    
    \b
    # Scrape only users
    python cerema-scraper.py --users-only
    
    \b
    # Custom output files
    python cerema-scraper.py --structures-output data/structures.jsonl --users-output data/users.jsonl
    
    \b
    # Restart from beginning
    python cerema-scraper.py --reset-state
    
    \b
    # Verbose mode
    python cerema-scraper.py --verbose
    """
    
    # Configure log level
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate mutually exclusive options
    if structures_only and users_only:
        logger.error("Cannot specify both --structures-only and --users-only")
        sys.exit(1)
    
    # Determine what to scrape
    data_types = []
    if structures_only:
        data_types = [DataType.STRUCTURES]
    elif users_only:
        data_types = [DataType.USERS]
    else:
        data_types = [DataType.STRUCTURES, DataType.USERS]
    
    # Remove state files if requested
    if reset_state:
        for state_file in [structures_state_file, users_state_file]:
            if os.path.exists(state_file):
                os.remove(state_file)
                logger.info(f"State file {state_file} removed")
            else:
                logger.info(f"No state file to remove: {state_file}")
    
    try:
        # Create configuration
        config = Config(
            bearer_token=token,
            base_url=base_url,
            structures_output=structures_output,
            users_output=users_output,
            structures_state_file=structures_state_file,
            users_state_file=users_state_file,
            delay_between_requests=delay,
            max_retries=max_retries,
            retry_delay=retry_delay,
            verbose=verbose
        )
        
        # Run scraper
        run_scraper(config, data_types)
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()