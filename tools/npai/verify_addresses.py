#!/usr/bin/env python3
"""
NPAI address verification script using La Poste API
Verifies validity of property owner addresses in database
"""

import argparse
import csv
import logging
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple

import psycopg2
import requests
from psycopg2.extras import RealDictCursor
from tqdm import tqdm


@dataclass
class Owner:
    """Represents a property owner with their address"""
    id: str
    address_dgfip: List[str]
    concatenated_address: str
    full_name: Optional[str] = None
    ban_address: Optional[str] = None
    ban_score: Optional[float] = None


@dataclass
class AddressVerification:
    """Address verification result"""
    owner_id: str
    original_address: str
    status: str  # 'unknown', 'valid', 'ambiguous', 'error'
    api_results_count: int
    best_match_code: Optional[str] = None
    best_match_address: Optional[str] = None
    similarity_score: Optional[float] = None
    api_response: Optional[Dict] = None
    # New fields for recipient analysis
    has_recipient: Optional[bool] = None
    recipient_name: Optional[str] = None
    recipient_similarity: Optional[float] = None
    # BAN data for comparison
    ban_address: Optional[str] = None
    ban_score: Optional[float] = None


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure logging system"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    return logging.getLogger(__name__)


def connect_to_database(db_uri: str) -> psycopg2.extensions.connection:
    """Establish connection to PostgreSQL database"""
    try:
        conn = psycopg2.connect(db_uri)
        return conn
    except psycopg2.Error as e:
        raise Exception(f"Database connection error: {e}")


def fetch_owners(conn: psycopg2.extensions.connection, limit: int) -> List[Owner]:
    """
    Fetch property owners and their addresses from database.

    Strategy: Fetch a larger sample, filter for valid addresses,
    then return up to 'limit' owners with valid addresses.
    """
    logger = logging.getLogger(__name__)

    # Calculate a larger sample size to ensure we get enough valid addresses
    # Use a multiplier based on expected hit rate (assume ~20% have valid addresses)
    sample_size = min(limit * 10, 50000)  # Cap at 50k to avoid memory issues

    # This will be updated with the correct table name later

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            logger.info(f"Fetching up to {sample_size} owners to find {limit} with valid addresses...")

            # First, let's find the correct table name and schema
            cursor.execute("""
                SELECT schemaname, tablename FROM pg_tables
                WHERE tablename LIKE '%owner%'
                ORDER BY schemaname, tablename
            """)
            owner_tables = cursor.fetchall()
            logger.info(f"Tables containing 'owner': {[(t['schemaname'], t['tablename']) for t in owner_tables]}")

            # Try to find the correct owners table
            owners_table = None
            for table in owner_tables:
                if table['tablename'] == 'owners':
                    owners_table = f"{table['schemaname']}.{table['tablename']}"
                    break

            if not owners_table:
                # Fallback to just 'owners' (might be in public schema)
                owners_table = 'owners'

            logger.info(f"Using table: {owners_table}")

            # Check if the table exists and has data
            try:
                cursor.execute(f"SELECT COUNT(*) as total FROM {owners_table}")
                total_count = cursor.fetchone()['total']
                logger.info(f"Total owners in {owners_table}: {total_count}")
            except psycopg2.Error as e:
                logger.error(f"Error accessing {owners_table}: {e}")
                # Try to list all tables to help debug
                cursor.execute("SELECT schemaname, tablename FROM pg_tables ORDER BY schemaname, tablename")
                all_tables = cursor.fetchall()
                logger.info(f"All available tables: {[(t['schemaname'], t['tablename']) for t in all_tables[:20]]}")  # First 20 tables
                return []

            if total_count == 0:
                logger.warning(f"No owners found in {owners_table}!")
                return []

            # Check what columns exist in the actual table
            schema_name, table_name = owners_table.split('.') if '.' in owners_table else ('public', owners_table)
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = %s AND table_schema = %s
                ORDER BY ordinal_position
            """, (table_name, schema_name))
            columns = [row['column_name'] for row in cursor.fetchall()]
            logger.info(f"Available columns in {owners_table}: {columns}")

            # Check if address_dgfip column exists
            if 'address_dgfip' not in columns:
                logger.error("Column 'address_dgfip' not found in owners table!")
                # Try to find address-related columns
                address_columns = [col for col in columns if 'address' in col.lower()]
                logger.info(f"Found address-related columns: {address_columns}")
                return []

            # Execute the main query with the correct table name, joining with ban_addresses
            query = f"""
            SELECT o.id, o.address_dgfip, o.full_name, ba.address as ban_address, ba.score as ban_score
            FROM {owners_table} o
            LEFT JOIN ban_addresses ba ON ba.ref_id = o.id
            ORDER BY o.id
            LIMIT %s
            """
            logger.info(f"Executing query: {query} with limit {sample_size}")
            cursor.execute(query, (sample_size,))
            results = cursor.fetchall()
            logger.info(f"SQL query returned {len(results)} rows")

            # Analyze the first few rows for debugging
            owners = []
            invalid_reasons = {
                'null_address': 0,
                'empty_array': 0,
                'empty_concatenated': 0,
                'valid': 0
            }

            for i, row in enumerate(results):
                logger.debug(f"Row {i+1}: id={row['id']}, address_dgfip={row['address_dgfip']}, full_name={row['full_name']}, ban_address={row.get('ban_address')}, ban_score={row.get('ban_score')}")

                # Detailed validation with logging
                if row['address_dgfip'] is None:
                    invalid_reasons['null_address'] += 1
                    if i < 5:  # Log first 5 examples
                        logger.debug(f"Owner {row['id']}: address_dgfip is NULL")
                    continue

                if len(row['address_dgfip']) == 0:
                    invalid_reasons['empty_array'] += 1
                    if i < 5:
                        logger.debug(f"Owner {row['id']}: address_dgfip is empty array")
                    continue

                # Concatenate address_dgfip array elements
                concatenated = ' '.join(filter(None, row['address_dgfip']))
                if not concatenated.strip():
                    invalid_reasons['empty_concatenated'] += 1
                    if i < 5:
                        logger.debug(f"Owner {row['id']}: address_dgfip concatenated to empty string: {row['address_dgfip']}")
                    continue

                # Valid address found
                invalid_reasons['valid'] += 1
                if i < 5:
                    logger.debug(f"Owner {row['id']}: VALID address: '{concatenated.strip()}'")

                owners.append(Owner(
                    id=row['id'],
                    address_dgfip=row['address_dgfip'],
                    concatenated_address=concatenated.strip(),
                    full_name=row['full_name'],
                    ban_address=row.get('ban_address'),
                    ban_score=row.get('ban_score')
                ))

                # Stop once we have enough valid owners
                if len(owners) >= limit:
                    break

            # Log validation statistics
            logger.info(f"Address validation results:")
            logger.info(f"  - NULL addresses: {invalid_reasons['null_address']}")
            logger.info(f"  - Empty arrays: {invalid_reasons['empty_array']}")
            logger.info(f"  - Empty concatenated: {invalid_reasons['empty_concatenated']}")
            logger.info(f"  - Valid addresses: {invalid_reasons['valid']}")

            logger.info(f"Retrieved {len(owners)} owners with valid addresses (from {len(results)} total)")
            return owners

    except psycopg2.Error as e:
        raise Exception(f"Error fetching owners: {e}")


class RateLimitExceedException(Exception):
    """Exception raised when API rate limit is exceeded and all retries failed"""
    pass


def call_laposte_api(address: str, api_key: str, max_retries: int = 3) -> Tuple[int, Optional[Dict]]:
    """Call La Poste API to verify an address with retry logic"""
    logger = logging.getLogger(__name__)

    url = "https://api.laposte.fr/controladresse/v2/adresses"
    headers = {
        'X-Okapi-Key': api_key,
        'Accept': 'application/json'
    }
    params = {
        'q': address
    }

    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                results_count = len(data) if isinstance(data, list) else 0
                logger.debug(f"API success: {results_count} results for address: {address[:50]}...")
                return results_count, data
            elif response.status_code == 401:
                logger.error("La Poste API authentication error - Check API key")
                return -1, None
            elif response.status_code == 403:
                logger.error(f"La Poste API forbidden (403) - Check API key permissions or endpoint")
                logger.error(f"Request URL: {url}")
                logger.error(f"Response: {response.text[:200]}")
                return -1, None
            elif response.status_code == 429:
                logger.warning(f"Rate limit reached - Retry {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    # All retries exhausted for rate limit
                    raise RateLimitExceedException("Rate limit exceeded after all retries")
            elif response.status_code >= 500:
                logger.warning(f"Server error {response.status_code} - Retry {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(1 + attempt)
                    continue
                return -1, None
            else:
                logger.warning(f"La Poste API error {response.status_code} for: {address}")
                return -1, None

        except requests.Timeout:
            logger.warning(f"Request timeout - Retry {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                time.sleep(1 + attempt)
                continue
            return -1, None
        except requests.ConnectionError:
            logger.warning(f"Connection error - Retry {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                time.sleep(2 + attempt)
                continue
            return -1, None
        except requests.RequestException as e:
            logger.error(f"Network error during API call: {e}")
            return -1, None

    return -1, None


def call_laposte_detail_api(code: str, api_key: str, max_retries: int = 3) -> Optional[Dict]:
    """Call La Poste API to get address details with retry logic"""
    logger = logging.getLogger(__name__)

    url = f"https://api.laposte.fr/controladresse/v2/adresses/{code}"
    headers = {
        'X-Okapi-Key': api_key,
        'Accept': 'application/json'
    }

    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                logger.error("La Poste API authentication error - Check API key")
                return None
            elif response.status_code == 429:
                logger.warning(f"Rate limit reached for detail API - Retry {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    return None
            elif response.status_code >= 500:
                logger.warning(f"Server error {response.status_code} for detail API - Retry {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(1 + attempt)
                    continue
                return None
            else:
                logger.warning(f"La Poste detail API error {response.status_code} for code: {code}")
                return None

        except requests.Timeout:
            logger.warning(f"Detail API request timeout - Retry {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                time.sleep(1 + attempt)
                continue
            return None
        except requests.ConnectionError:
            logger.warning(f"Detail API connection error - Retry {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                time.sleep(2 + attempt)
                continue
            return None
        except requests.RequestException as e:
            logger.error(f"Network error during detail API call: {e}")
            return None

    return None


def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate similarity between two strings (0-1)"""
    # Basic normalization
    text1_norm = text1.lower().strip()
    text2_norm = text2.lower().strip()

    # Calculate similarity using SequenceMatcher
    similarity = SequenceMatcher(None, text1_norm, text2_norm).ratio()
    return round(similarity, 3)


def find_best_match(original_address: str, api_results: List[Dict]) -> Tuple[Optional[str], Optional[str], Optional[float]]:
    """Find best match among API results"""
    if not api_results:
        return None, None, None

    best_similarity = 0.0
    best_code = None
    best_address = None

    for result in api_results:
        if 'adresse' in result:
            similarity = calculate_similarity(original_address, result['adresse'])
            if similarity > best_similarity:
                best_similarity = similarity
                best_code = result.get('code')
                best_address = result['adresse']

    return best_code, best_address, best_similarity if best_similarity > 0 else None


def analyze_recipient(owner: Owner, best_match_code: str, api_key: str) -> Tuple[bool, Optional[str], Optional[float]]:
    """Analyze recipient information from address detail API"""
    logger = logging.getLogger(__name__)

    if not best_match_code:
        return False, None, None

    try:
        # Get address details
        detail_data = call_laposte_detail_api(best_match_code, api_key)

        if not detail_data:
            return False, None, None

        # Extract recipient information
        recipient = detail_data.get('destinataire', '').strip()
        has_recipient = bool(recipient)

        # Calculate similarity with owner name if both exist
        recipient_similarity = None
        if has_recipient and owner.full_name and owner.full_name.strip():
            recipient_similarity = calculate_similarity(owner.full_name, recipient)

        return has_recipient, recipient if has_recipient else None, recipient_similarity

    except Exception as e:
        logger.warning(f"Error analyzing recipient for code {best_match_code}: {e}")
        return False, None, None


def verify_address(owner: Owner, api_key: str) -> AddressVerification:
    """Verify an address via La Poste API"""
    logger = logging.getLogger(__name__)

    try:
        # Build search query with owner name and address
        search_query = owner.concatenated_address
        if owner.full_name and owner.full_name.strip():
            search_query = f"{owner.full_name} {owner.concatenated_address}"

        # API call with built-in retry logic
        results_count, api_data = call_laposte_api(search_query, api_key)

        if results_count == -1 or results_count == -2:
            # Error or rate limit failure after all retries
            return AddressVerification(
                owner_id=owner.id,
                original_address=search_query,
                status='error',
                api_results_count=0
            )

        # Find best match first
        best_code, best_address, similarity = None, None, None
        if api_data and isinstance(api_data, list) and len(api_data) > 0:
            best_code, best_address, similarity = find_best_match(
                search_query,
                api_data
            )

        # Analyze recipient information if we have a match
        has_recipient, recipient_name, recipient_similarity = False, None, None
        if best_code:
            has_recipient, recipient_name, recipient_similarity = analyze_recipient(
                owner, best_code, api_key
            )

        # Process results with improved logic
        if results_count == 0:
            status = 'unknown'
        elif results_count == 1:
            status = 'valid'
        else:
            # Multiple results: check match quality
            if similarity and similarity >= 0.95:
                # Near-perfect match despite multiple results
                status = 'valid'
            elif similarity and similarity >= 0.8:
                # Good match but not perfect
                status = 'valid_with_alternatives'
            else:
                # Fuzzy match
                status = 'ambiguous'

        return AddressVerification(
            owner_id=owner.id,
            original_address=search_query,
            status=status,
            api_results_count=results_count if results_count >= 0 else 0,
            best_match_code=best_code,
            best_match_address=best_address,
            similarity_score=similarity,
            api_response=api_data,
            has_recipient=has_recipient,
            recipient_name=recipient_name,
            recipient_similarity=recipient_similarity,
            ban_address=owner.ban_address,
            ban_score=owner.ban_score
        )

    except RateLimitExceedException:
        # Re-raise rate limit exception to stop the script
        raise


def init_csv_file(output_file: str):
    """Initialize CSV file with headers"""
    fieldnames = [
        'owner_id',
        'original_address',
        'status',
        'api_results_count',
        'best_match_code',
        'best_match_address',
        'similarity_score',
        'has_recipient',
        'recipient_name',
        'recipient_similarity',
        'ban_address',
        'ban_score',
        'verification_date'
    ]

    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
        return fieldnames
    except IOError as e:
        raise Exception(f"CSV initialization error: {e}")


def append_to_csv(verification: AddressVerification, output_file: str):
    """Append a single verification result to CSV file"""
    fieldnames = [
        'owner_id',
        'original_address',
        'status',
        'api_results_count',
        'best_match_code',
        'best_match_address',
        'similarity_score',
        'has_recipient',
        'recipient_name',
        'recipient_similarity',
        'ban_address',
        'ban_score',
        'verification_date'
    ]

    try:
        with open(output_file, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writerow({
                'owner_id': verification.owner_id,
                'original_address': verification.original_address,
                'status': verification.status,
                'api_results_count': verification.api_results_count,
                'best_match_code': verification.best_match_code or '',
                'best_match_address': verification.best_match_address or '',
                'similarity_score': verification.similarity_score or '',
                'has_recipient': verification.has_recipient if verification.has_recipient is not None else '',
                'recipient_name': verification.recipient_name or '',
                'recipient_similarity': verification.recipient_similarity or '',
                'ban_address': verification.ban_address or '',
                'ban_score': verification.ban_score or '',
                'verification_date': datetime.now().isoformat()
            })
    except IOError as e:
        raise Exception(f"CSV append error: {e}")


def export_to_csv(verifications: List[AddressVerification], output_file: str):
    """Export results to CSV file (legacy function for compatibility)"""
    logger = logging.getLogger(__name__)

    try:
        init_csv_file(output_file)
        for verification in verifications:
            append_to_csv(verification, output_file)
        logger.info(f"Results exported to: {output_file}")
    except IOError as e:
        raise Exception(f"CSV export error: {e}")


def print_summary(verifications: List[AddressVerification]):
    """Print results summary"""
    logger = logging.getLogger(__name__)

    total = len(verifications)
    if total == 0:
        logger.info("No verifications performed")
        return

    status_counts = {}
    similarity_scores = []
    recipient_stats = {
        'total_with_results': 0,
        'with_recipient': 0,
        'recipient_similarities': []
    }

    for verification in verifications:
        status_counts[verification.status] = status_counts.get(verification.status, 0) + 1
        if verification.similarity_score is not None:
            similarity_scores.append(verification.similarity_score)

        # Recipient statistics
        if verification.has_recipient is not None:
            recipient_stats['total_with_results'] += 1
            if verification.has_recipient:
                recipient_stats['with_recipient'] += 1
                if verification.recipient_similarity is not None:
                    recipient_stats['recipient_similarities'].append(verification.recipient_similarity)

    logger.info(f"\n{'='*60}")
    logger.info(f"NPAI VERIFICATION SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Total addresses verified: {total}")
    logger.info(f"")

    for status, count in status_counts.items():
        percentage = (count / total) * 100
        status_labels = {
            'valid': 'Valid addresses',
            'valid_with_alternatives': 'Valid addresses with alternatives',
            'unknown': 'Unknown addresses (potential NPAI)',
            'ambiguous': 'Ambiguous addresses',
            'error': 'API errors'
        }
        logger.info(f"{status_labels.get(status, status)}: {count} ({percentage:.1f}%)")

    if similarity_scores:
        avg_similarity = sum(similarity_scores) / len(similarity_scores)
        logger.info(f"")
        logger.info(f"Average address similarity score: {avg_similarity:.3f}")
        logger.info(f"Address similarity - Min: {min(similarity_scores):.3f}, Max: {max(similarity_scores):.3f}")

    # Recipient analysis summary
    logger.info(f"")
    logger.info(f"{'='*60}")
    logger.info(f"RECIPIENT ANALYSIS")
    logger.info(f"{'='*60}")

    if recipient_stats['total_with_results'] > 0:
        recipient_percentage = (recipient_stats['with_recipient'] / recipient_stats['total_with_results']) * 100
        logger.info(f"Addresses with detailed results: {recipient_stats['total_with_results']}")
        logger.info(f"Addresses with recipient found: {recipient_stats['with_recipient']} ({recipient_percentage:.1f}%)")

        if recipient_stats['recipient_similarities']:
            avg_recipient_sim = sum(recipient_stats['recipient_similarities']) / len(recipient_stats['recipient_similarities'])
            logger.info(f"Average name similarity (owner vs recipient): {avg_recipient_sim:.3f}")
            logger.info(f"Name similarity - Min: {min(recipient_stats['recipient_similarities']):.3f}, Max: {max(recipient_stats['recipient_similarities']):.3f}")
        else:
            logger.info(f"No name similarity data available (no owner names provided)")
    else:
        logger.info(f"No detailed recipient analysis available")


def main():
    """
    Main function for NPAI address verification.

    Supports random sampling of owners for testing purposes:
    - --random: Shuffles the list of owners before processing
    - --seed: Sets a specific seed for reproducible random order
    """
    parser = argparse.ArgumentParser(
        description="NPAI address verification using La Poste API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Usage examples:
  %(prog)s --api-key YOUR_KEY --db-uri "postgresql://user:pass@localhost/db"
  %(prog)s --limit 500 --api-key KEY --db-uri URI --output results.csv
  %(prog)s --random --seed 12345 --api-key KEY --db-uri URI --limit 100
  %(prog)s --random --api-key KEY --db-uri URI  # Uses random seed
        """
    )

    parser.add_argument(
        '--limit',
        type=int,
        default=2000,
        help='Maximum number of addresses to verify (default: 2000)'
    )

    parser.add_argument(
        '--api-key',
        required=True,
        help='La Poste API key (X-Okapi-Key)'
    )

    parser.add_argument(
        '--db-uri',
        required=True,
        help='PostgreSQL connection URI (e.g.: postgresql://user:pass@host:port/db)'
    )

    parser.add_argument(
        '--output',
        default=f'npai_verification_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
        help='CSV output file (default: npai_verification_YYYYMMDD_HHMMSS.csv)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose mode (debug)'
    )

    parser.add_argument(
        '--random',
        action='store_true',
        help='Randomize the order of owners before processing'
    )

    parser.add_argument(
        '--seed',
        type=int,
        default=None,
        help='Random seed for reproducible results (only used with --random)'
    )

    args = parser.parse_args()

    # Validate arguments
    if args.seed is not None and not args.random:
        parser.error("--seed can only be used with --random")

    # Setup logging
    logger = setup_logging(args.verbose)

    try:
        # Database connection
        logger.info("Connecting to database...")
        conn = connect_to_database(args.db_uri)

        # Fetch owners
        logger.info(f"Fetching up to {args.limit} owners...")
        owners = fetch_owners(conn, args.limit)

        if not owners:
            logger.warning("No owners found with valid addresses")
            return 1

        # Apply random shuffling if requested
        if args.random:
            # Set seed for reproducibility
            if args.seed is not None:
                random.seed(args.seed)
                logger.info(f"Using random seed: {args.seed}")
            else:
                # Generate and log the seed for potential reproduction
                seed = random.randint(0, 2**32 - 1)
                random.seed(seed)
                logger.info(f"Generated random seed: {seed}")

            # Shuffle the owners list
            random.shuffle(owners)
            logger.info(f"Randomized order of {len(owners)} owners")

        # Initialize CSV file
        logger.info("Initializing CSV output file...")
        init_csv_file(args.output)

        # Address verification with progress bar and streaming CSV
        logger.info(f"Starting verification of {len(owners)} addresses...")
        verifications = []
        processed_count = 0

        try:
            # Use tqdm for progress bar
            for owner in tqdm(owners, desc="Verifying addresses", unit="address"):
                try:
                    verification = verify_address(owner, args.api_key)
                    verifications.append(verification)

                    # Write to CSV immediately
                    append_to_csv(verification, args.output)
                    processed_count += 1

                    # Small delay to respect API limits (increased due to 2 API calls per address)
                    time.sleep(0.2)

                except RateLimitExceedException:
                    logger.warning("Rate limit exceeded - Stopping script to preserve data")
                    break

        except KeyboardInterrupt:
            logger.info("User interruption - Saving processed results")

        # Print summary of processed results
        if verifications:
            logger.info(f"Processed {processed_count} addresses before stopping")
            print_summary(verifications)
            logger.info(f"Results saved to: {args.output}")
        else:
            logger.warning("No addresses were processed successfully")

        # Cleanup
        conn.close()

        if processed_count > 0:
            logger.info("NPAI verification completed with partial results!")
            return 0
        else:
            logger.error("NPAI verification failed - no results generated")
            return 1

    except KeyboardInterrupt:
        logger.info("User interruption")
        return 130
    except Exception as e:
        logger.error(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
