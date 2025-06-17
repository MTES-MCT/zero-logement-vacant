#!/usr/bin/env python3
"""
Script to retrieve all structures from the Portail DF Cerema API
and save them to a JSON Lines file with automatic resume capability.
"""

import requests
import json
import time
import os
from typing import Optional, Set
from dataclasses import dataclass, asdict
from pathlib import Path

# Configuration
BEARER_TOKEN = os.getenv('CEREMA_API_TOKEN')  # Get token from environment variable
BASE_URL = "https://portaildf.cerema.fr/api/structures"
OUTPUT_FILE = "structures.jsonl"
STATE_FILE = "api_structures_state.json"
DELAY_BETWEEN_REQUESTS = 0.5  # Delay in seconds between requests
MAX_RETRIES = 3  # Maximum number of attempts per page
RETRY_DELAY = 5  # Delay between retry attempts in seconds

@dataclass
class ScriptState:
    """Script state for resume functionality."""
    last_completed_page: int = 0
    next_url: Optional[str] = BASE_URL
    total_structures_processed: int = 0
    existing_structure_ids: Set[int] = None
    
    def __post_init__(self):
        if self.existing_structure_ids is None:
            self.existing_structure_ids = set()

def get_headers() -> dict:
    """Returns HTTP headers with authentication token."""
    return {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "Python API Client - Structures"
    }

def load_state() -> ScriptState:
    """
    Loads previous state from backup file.
    
    Returns:
        ScriptState: Loaded state or new state if file doesn't exist
    """
    if not os.path.exists(STATE_FILE):
        return ScriptState()
    
    try:
        with open(STATE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Convert ID list to set for performance
            existing_ids = set(data.get('existing_structure_ids', []))
            return ScriptState(
                last_completed_page=data.get('last_completed_page', 0),
                next_url=data.get('next_url', BASE_URL),
                total_structures_processed=data.get('total_structures_processed', 0),
                existing_structure_ids=existing_ids
            )
    except (json.JSONDecodeError, KeyError) as e:
        print(f"⚠️  Error loading state: {e}")
        print("🔄 Starting from the beginning...")
        return ScriptState()

def save_state(state: ScriptState):
    """
    Saves current state to backup file.
    
    Args:
        state: State to save
    """
    try:
        # Convert set to list for JSON serialization
        state_dict = {
            'last_completed_page': state.last_completed_page,
            'next_url': state.next_url,
            'total_structures_processed': state.total_structures_processed,
            'existing_structure_ids': list(state.existing_structure_ids)
        }
        
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state_dict, f, indent=2, ensure_ascii=False)
    except IOError as e:
        print(f"⚠️  Error saving state: {e}")

def load_existing_structure_ids(filename: str) -> Set[int]:
    """
    Loads IDs of structures already present in the JSON Lines file.
    
    Args:
        filename: JSON Lines filename
        
    Returns:
        Set[int]: Set of existing structure IDs
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
                    structure = json.loads(line)
                    # Check different possible fields for the ID
                    structure_id = structure.get('id') or structure.get('id_structure')
                    if structure_id:
                        existing_ids.add(structure_id)
                except json.JSONDecodeError as e:
                    print(f"⚠️  Invalid line {line_num} in {filename}: {e}")
    except IOError as e:
        print(f"⚠️  Error reading {filename}: {e}")
    
    return existing_ids

def fetch_page_with_retry(url: str, max_retries: int = MAX_RETRIES) -> Optional[dict]:
    """
    Retrieves a page of data from the API with retry mechanism.
    
    Args:
        url: URL of the page to retrieve
        max_retries: Maximum number of attempts
        
    Returns:
        dict: JSON data from response or None in case of definitive failure
    """
    for attempt in range(1, max_retries + 1):
        try:
            print(f"🔄 Attempt {attempt}/{max_retries}...")
            response = requests.get(url, headers=get_headers(), timeout=60)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            print(f"⏱️  Timeout on attempt {attempt}")
            if attempt < max_retries:
                print(f"⏳ Waiting {RETRY_DELAY} seconds before retry...")
                time.sleep(RETRY_DELAY)
            
        except requests.exceptions.RequestException as e:
            print(f"🌐 Network error on attempt {attempt}: {e}")
            if attempt < max_retries:
                print(f"⏳ Waiting {RETRY_DELAY} seconds before retry...")
                time.sleep(RETRY_DELAY)
                
        except json.JSONDecodeError as e:
            print(f"📄 JSON decoding error: {e}")
            break  # No retry for decoding errors
    
    print(f"❌ Definitive failure after {max_retries} attempts")
    return None

def save_new_structures_to_jsonl(structures: list, existing_ids: Set[int], filename: str):
    """
    Saves only new structures to a JSON Lines file.
    
    Args:
        structures: List of structures to process
        existing_ids: Set of already existing IDs
        filename: Output filename
        
    Returns:
        int: Number of new structures saved
    """
    new_structures_count = 0
    
    try:
        with open(filename, 'a', encoding='utf-8') as f:
            for structure in structures:
                # Check different possible fields for the ID
                structure_id = structure.get('id') or structure.get('id_structure')
                if structure_id and structure_id not in existing_ids:
                    json.dump(structure, f, ensure_ascii=False)
                    f.write('\n')
                    existing_ids.add(structure_id)
                    new_structures_count += 1
    except IOError as e:
        print(f"💾 Error writing to file {filename}: {e}")
    
    return new_structures_count

def cleanup_state_file():
    """Removes the state file at the end of processing."""
    try:
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
            print(f"🗑️  State file {STATE_FILE} deleted")
    except OSError as e:
        print(f"⚠️  Unable to delete state file: {e}")

def analyze_structures(filename: str):
    """
    Analyzes retrieved structures and displays statistics.
    
    Args:
        filename: JSON Lines filename of structures
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
                    
                    # Analyze structure type
                    struct_type = structure.get('type', 'Unknown')
                    structure_types[struct_type] = structure_types.get(struct_type, 0) + 1
                    
                    # Analyze LOVAC access
                    if structure.get('acces_lovac'):
                        with_acces_lovac += 1
                    else:
                        without_acces_lovac += 1
                        
                except json.JSONDecodeError:
                    continue
        
        print(f"\n📊 === STRUCTURE ANALYSIS ===")
        print(f"🏢 Total structures: {total_structures}")
        print(f"✅ With LOVAC access: {with_acces_lovac}")
        print(f"❌ Without LOVAC access: {without_acces_lovac}")
        
        if structure_types:
            print(f"\n📋 === DISTRIBUTION BY TYPE ===")
            for struct_type, count in sorted(structure_types.items(), key=lambda x: x[1], reverse=True):
                print(f"  {struct_type}: {count} structures")
                
    except IOError as e:
        print(f"⚠️  Error during analysis: {e}")

def validate_token():
    """Validates that the bearer token is configured."""
    if not BEARER_TOKEN:
        print("❌ ERROR: CEREMA_API_TOKEN environment variable is not set!")
        print("💡 Please set it with: export CEREMA_API_TOKEN='your_token_here'")
        return False
    return True

def main():
    """Main function that orchestrates data retrieval."""
    print("🚀 Starting structure retrieval...")
    
    # Token validation
    if not validate_token():
        return
    
    # Load previous state
    state = load_state()
    
    # If resuming, load existing IDs from file
    if state.last_completed_page > 0:
        print(f"🔄 Resuming from page {state.last_completed_page + 1}")
        print(f"📊 {state.total_structures_processed} structures already processed")
        if not state.existing_structure_ids:
            print("📖 Reading existing structures...")
            state.existing_structure_ids = load_existing_structure_ids(OUTPUT_FILE)
    else:
        print("🆕 New processing")
        # Create empty output file
        Path(OUTPUT_FILE).touch()
        state.existing_structure_ids = set()
    
    current_url = state.next_url
    page_number = state.last_completed_page + 1
    
    try:
        while current_url:
            print(f"\n📄 Processing page {page_number}...")
            
            # Retrieve data from current page with retry
            data = fetch_page_with_retry(current_url)
            
            if data is None:
                print(f"❌ Definitive failure retrieving page {page_number}")
                print("💾 Saving state for later resume...")
                save_state(state)
                return
            
            # Extract structures
            structures = data.get('results', [])
            if structures:
                new_structures_count = save_new_structures_to_jsonl(structures, state.existing_structure_ids, OUTPUT_FILE)
                state.total_structures_processed += len(structures)
                
                if new_structures_count > 0:
                    print(f"✅ Page {page_number}: {new_structures_count} new structures saved ({len(structures)} total)")
                else:
                    print(f"⏭️  Page {page_number}: No new structures (all already present)")
            else:
                print(f"⚠️  Page {page_number}: No structures found")
            
            # Update state
            state.last_completed_page = page_number
            state.next_url = data.get('next')
            
            # Display statistics
            total_count = data.get('count', 0)
            unique_structures = len(state.existing_structure_ids)
            print(f"📊 Progress: {state.total_structures_processed}/{total_count} structures processed")
            print(f"🏢 Unique structures: {unique_structures}")
            
            # Save state periodically
            save_state(state)
            
            # Prepare next page
            current_url = state.next_url
            
            if current_url:
                page_number += 1
                # Wait a bit before next request
                time.sleep(DELAY_BETWEEN_REQUESTS)
            else:
                print("📄 Last page reached")
        
        print(f"\n🎉 Retrieval completed successfully!")
        print(f"📁 Output file: {OUTPUT_FILE}")
        print(f"🏢 Total unique structures: {len(state.existing_structure_ids)}")
        print(f"📄 Pages processed: {state.last_completed_page}")
        
        # Analyze retrieved structures
        analyze_structures(OUTPUT_FILE)
        
        # Clean up state file
        cleanup_state_file()
        
    except KeyboardInterrupt:
        print(f"\n\n⏹️  User interruption")
        print("💾 Saving state for later resume...")
        save_state(state)
        print(f"🔄 To resume, simply run the script again")

if __name__ == "__main__":
    main()