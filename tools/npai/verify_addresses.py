#!/usr/bin/env python3
"""
NPAI address verification script using La Poste API
Verifies validity of property owner addresses in database
"""

import argparse
import csv
import logging
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
    """Fetch property owners and their addresses from database"""
    logger = logging.getLogger(__name__)

    query = """
    SELECT id, address_dgfip
    FROM owners
    WHERE address_dgfip IS NOT NULL
      AND cardinality(address_dgfip) > 0
    ORDER BY id
    LIMIT %s
    """

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, (limit,))
            results = cursor.fetchall()

            owners = []
            for row in results:
                # Concatenate address_dgfip array elements
                concatenated = ' '.join(filter(None, row['address_dgfip']))
                if concatenated.strip():  # Skip empty addresses
                    owners.append(Owner(
                        id=row['id'],
                        address_dgfip=row['address_dgfip'],
                        concatenated_address=concatenated.strip()
                    ))

            logger.info(f"Retrieved {len(owners)} owners with valid addresses")
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
                return results_count, data
            elif response.status_code == 401:
                logger.error("La Poste API authentication error - Check API key")
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


def verify_address(owner: Owner, api_key: str) -> AddressVerification:
    """Verify an address via La Poste API"""
    logger = logging.getLogger(__name__)

    try:
        # API call with built-in retry logic
        results_count, api_data = call_laposte_api(owner.concatenated_address, api_key)

        if results_count == -1 or results_count == -2:
            # Error or rate limit failure after all retries
            return AddressVerification(
                owner_id=owner.id,
                original_address=owner.concatenated_address,
                status='error',
                api_results_count=0
            )

        # Find best match first
        best_code, best_address, similarity = None, None, None
        if api_data and isinstance(api_data, list) and len(api_data) > 0:
            best_code, best_address, similarity = find_best_match(
                owner.concatenated_address,
                api_data
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
            original_address=owner.concatenated_address,
            status=status,
            api_results_count=results_count if results_count >= 0 else 0,
            best_match_code=best_code,
            best_match_address=best_address,
            similarity_score=similarity,
            api_response=api_data
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

    for verification in verifications:
        status_counts[verification.status] = status_counts.get(verification.status, 0) + 1
        if verification.similarity_score is not None:
            similarity_scores.append(verification.similarity_score)

    logger.info(f"\n{'='*50}")
    logger.info(f"NPAI VERIFICATION SUMMARY")
    logger.info(f"{'='*50}")
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
        logger.info(f"Average similarity score: {avg_similarity:.3f}")
        logger.info(f"Similarity scores - Min: {min(similarity_scores):.3f}, Max: {max(similarity_scores):.3f}")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="NPAI address verification using La Poste API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Usage examples:
  %(prog)s --api-key YOUR_KEY --db-uri "postgresql://user:pass@localhost/db"
  %(prog)s --limit 500 --api-key KEY --db-uri URI --output results.csv
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

    args = parser.parse_args()

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

                    # Small delay to respect API limits
                    time.sleep(0.1)

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
