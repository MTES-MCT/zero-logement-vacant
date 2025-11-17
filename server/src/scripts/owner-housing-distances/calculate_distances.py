#!/usr/bin/env python3
"""
Calculate distances between owners and their housing properties.

This script processes owner-housing pairs to calculate geographical distances
and apply classification rules based on French territorial organization.

Logic:
- Addresses with coordinates = geolocated in French BAN → French address → geographic rules
- Addresses without coordinates = not geolocated → potentially foreign → country_detector

Usage:
    python calculate_distances.py
    python calculate_distances.py --limit 1000 --force
"""

import argparse
import logging
import sys
import os
import csv
from datetime import datetime
from math import radians, cos, sin, asin, sqrt
from typing import Optional, Tuple, List
import psycopg2
from psycopg2.extras import RealDictCursor
from tqdm import tqdm
import requests

# Add the project root to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

# Import country detection module
from country_detector import CountryDetector

class DistanceCalculator:
    """
    Calculate distances and apply classification rules for owner-housing pairs.
    Tests country_detector only on addresses without coordinates.
    """

    def __init__(self, db_url: str):
        """Initialize with database connection."""
        self.db_url = db_url
        self.conn = None
        self.cursor = None
        self.metro_regions = None
        self.overseas_regions = None

        # Initialize country detector
        self.country_detector = CountryDetector(model_name="rule-based", use_llm=False)

        self.stats = {
            'processed_pairs': 0,
            'addresses_with_coords': 0,
            'addresses_without_coords': 0,
            'distances_calculated': 0,
            'geographic_rules_applied': 0,
            'france_detected': 0,
            'foreign_detected': 0,
            'errors': 0,
            'missing_owner_data': 0,
            'missing_housing_data': 0,
            'missing_both_data': 0,
            'pairs_with_both_coords': 0,
            'pairs_with_owner_coords_only': 0,
            'pairs_with_housing_coords_only': 0,
            'pairs_with_no_coords': 0,
            'owners_tested': 0,
            'owners_france': 0,
            'owners_foreign': 0,
            'housing_tested': 0,
            'housing_france': 0,
            'housing_foreign': 0
        }

        # Initialize CSV logging
        self.setup_csv_logging()

    def setup_csv_logging(self):
        """Setup CSV logging for address classifications - disabled for performance."""
        self.classification_csv_file = None
        self.classification_csv_writer = None

    def log_classification(self, owner_id: str, housing_id: str, address_type: str,
                         address: str, has_coords: bool, classification: str,
                         postal_code: str = None, test_method: str = None):
        """Log address classification to CSV - disabled for performance."""
        pass

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise

    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def detect_country_simple(self, address: str) -> str:
        """Simple country detection using the country detector."""
        if not address or not str(address).strip() or str(address).strip().lower() in ['nan', 'null', 'none', '']:
            return "FRANCE"
        try:
            result = self.country_detector.detect_country(str(address).strip())
            return result
        except Exception as e:
            logging.debug(f"Country detection error for address '{address}': {e}")
            return "FRANCE"

    def get_owners_without_coordinates(self, limit: int = None):
        """Get all owners WITHOUT coordinates that need country detection."""
        try:
            query = """
                SELECT DISTINCT
                    oh.owner_id,
                    ba.address as owner_address,
                    ba.postal_code as owner_postal_code
                FROM owners_housing oh
                LEFT JOIN ban_addresses ba ON ba.ref_id = oh.owner_id AND ba.address_kind = 'Owner'
                WHERE (ba.longitude IS NULL OR ba.latitude IS NULL)
                  AND ba.address IS NOT NULL
            """

            if limit:
                query += f" LIMIT {limit}"

            self.cursor.execute(query)
            return self.cursor.fetchall()
        except Exception as e:
            print(f"❌ Error fetching owners without coordinates: {e}")
            raise

    def get_all_owner_housing_pairs(self, limit: int = None, force: bool = False):
        """Get all owner-housing pairs that need processing with random sampling when limit is given."""
        try:
            # Build WHERE clause based on force flag
            where_clause = "" if force else "WHERE oh.locprop_distance_ban IS NULL OR oh.locprop_relative_ban IS NULL"

            if limit:
                # Use random sampling with subquery to avoid DISTINCT + ORDER BY issue
                query = f"""
                    SELECT
                        owner_id,
                        housing_id,
                        locprop_distance_ban,
                        locprop_relative_ban,
                        owner_geo_code,
                        housing_geo_code
                    FROM (
                        SELECT DISTINCT
                            oh.owner_id,
                            oh.housing_id,
                            oh.locprop_distance_ban,
                            oh.locprop_relative_ban,
                            LEFT(owner_ba.postal_code, 5) as owner_geo_code,
                            h.geo_code as housing_geo_code
                        FROM owners_housing oh
                        LEFT JOIN fast_housing h ON h.id = oh.housing_id AND h.geo_code = oh.housing_geo_code
                        LEFT JOIN ban_addresses owner_ba ON owner_ba.ref_id = oh.owner_id AND owner_ba.address_kind = 'Owner'
                        {where_clause}
                    ) AS distinct_pairs
                    ORDER BY RANDOM()
                    LIMIT %s
                """
                self.cursor.execute(query, (limit,))
            else:
                # No sampling for full dataset
                query = f"""
                    SELECT DISTINCT
                        oh.owner_id,
                        oh.housing_id,
                        oh.locprop_distance_ban,
                        oh.locprop_relative_ban,
                        LEFT(owner_ba.postal_code, 5) as owner_geo_code,
                        h.geo_code as housing_geo_code
                    FROM owners_housing oh
                    LEFT JOIN fast_housing h ON h.id = oh.housing_id AND h.geo_code = oh.housing_geo_code
                    LEFT JOIN ban_addresses owner_ba ON owner_ba.ref_id = oh.owner_id AND owner_ba.address_kind = 'Owner'
                    {where_clause}
                """
                self.cursor.execute(query)

            return self.cursor.fetchall()
        except Exception as e:
            print(f"❌ Error fetching owner-housing pairs: {e}")
            raise

    def get_address_data(self, ref_id: str, address_kind: str) -> Optional[Tuple[str, str, float, float, str]]:
        """Get address data including postal code, address, lat, lon, geo_code."""
        try:
            if address_kind == 'Owner':
                self.cursor.execute("""
                    SELECT ba.postal_code, ba.address, ba.latitude, ba.longitude,
                           LEFT(ba.postal_code, 5) as geo_code
                    FROM ban_addresses ba
                    WHERE ba.ref_id = %s AND ba.address_kind = %s
                """, (ref_id, address_kind))
            else:  # Housing
                self.cursor.execute("""
                    SELECT ba.postal_code, ba.address, ba.latitude, ba.longitude,
                           h.geo_code
                    FROM ban_addresses ba
                    LEFT JOIN fast_housing h ON h.id = ba.ref_id
                    WHERE ba.ref_id = %s AND ba.address_kind = %s
                """, (ref_id, address_kind))

            result = self.cursor.fetchone()
            if result:
                return (result['postal_code'], result['address'],
                       result['latitude'], result['longitude'], result['geo_code'])
            return None
        except Exception as e:
            logging.debug(f"Error getting address data for {ref_id}: {e}")
            return None

    def batch_get_address_data(self, pairs: List) -> dict:
        """Get address data for a batch of pairs (much smaller, not all addresses)."""
        try:
            # Extract unique owner and housing IDs from THIS BATCH only
            owner_ids = list(set([pair['owner_id'] for pair in pairs]))
            housing_ids = list(set([pair['housing_id'] for pair in pairs]))

            address_cache = {}

            # Fetch owner addresses for this batch
            if owner_ids:
                self.cursor.execute("""
                    SELECT ba.ref_id::text, ba.postal_code, ba.address, ba.latitude, ba.longitude,
                           LEFT(ba.postal_code, 5) as geo_code
                    FROM ban_addresses ba
                    WHERE ba.ref_id::text = ANY(%s) AND ba.address_kind = 'Owner'
                """, (owner_ids,))

                for row in self.cursor.fetchall():
                    key = (row['ref_id'], 'Owner')
                    address_cache[key] = (row['postal_code'], row['address'],
                                        row['latitude'], row['longitude'], row['geo_code'])

            # Fetch housing addresses for this batch
            if housing_ids:
                self.cursor.execute("""
                    SELECT ba.ref_id::text, ba.postal_code, ba.address, ba.latitude, ba.longitude,
                           h.geo_code
                    FROM ban_addresses ba
                    LEFT JOIN fast_housing h ON h.id = ba.ref_id
                    WHERE ba.ref_id::text = ANY(%s) AND ba.address_kind = 'Housing'
                """, (housing_ids,))

                for row in self.cursor.fetchall():
                    key = (row['ref_id'], 'Housing')
                    address_cache[key] = (row['postal_code'], row['address'],
                                        row['latitude'], row['longitude'], row['geo_code'])

            return address_cache

        except Exception as e:
            logging.error(f"Error in batch_get_address_data: {e}")
            return {}

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> Optional[float]:
        """Calculate distance between two points using Haversine formula.

        Returns None if coordinates are invalid (out of valid ranges).
        Valid ranges: latitude [-90, 90], longitude [-180, 180]
        """
        # Validate coordinates
        if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90):
            logging.warning(f"Invalid latitude: lat1={lat1}, lat2={lat2}")
            return None
        if not (-180 <= lon1 <= 180 and -180 <= lon2 <= 180):
            logging.warning(f"Invalid longitude: lon1={lon1}, lon2={lon2}")
            return None

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radius of Earth in kilometers
        return c * r

    def process_single_pair(self, owner_id: str, housing_id: str, address_cache: dict = None) -> Tuple[Optional[float], int]:
        """
        Process a single owner-housing pair with correct logic.
        """

        # Get address data from cache if available, otherwise query individually
        if address_cache is not None:
            owner_data = address_cache.get((owner_id, 'Owner'))
            housing_data = address_cache.get((housing_id, 'Housing'))
        else:
            owner_data = self.get_address_data(owner_id, 'Owner')
            housing_data = self.get_address_data(housing_id, 'Housing')

        distance = None
        classification = 7  # Default

        # Count missing data (silent counting, no verbose logs)
        if not owner_data and not housing_data:
            self.stats['missing_both_data'] += 1
            return distance, classification
        elif not owner_data:
            self.stats['missing_owner_data'] += 1
        elif not housing_data:
            self.stats['missing_housing_data'] += 1

        # Handle cases where only one data source is available
        owner_postal = owner_address = owner_lat = owner_lon = owner_geo_code = None
        housing_postal = housing_address = housing_lat = housing_lon = housing_geo_code = None

        if owner_data:
            owner_postal, owner_address, owner_lat, owner_lon, owner_geo_code = owner_data
        if housing_data:
            housing_postal, housing_address, housing_lat, housing_lon, housing_geo_code = housing_data

        # Correct logic: Test country_detector only on addresses without coordinates

        # Check owner address
        owner_has_coords = (owner_lat is not None and owner_lon is not None)
        owner_classification = "FRANCE"  # Default for addresses with coordinates

        if owner_address:
            if not owner_has_coords:
                # No coordinates → potentially foreign → test
                owner_classification = self.detect_country_simple(owner_address)
                self.log_classification(owner_id, housing_id, 'owner', owner_address,
                                      False, owner_classification, owner_postal, 'country_detector')
            else:
                # With coordinates → French → no test needed
                self.stats['addresses_with_coords'] += 1
                self.log_classification(owner_id, housing_id, 'owner', owner_address,
                                      True, 'FRANCE', owner_postal, 'has_coordinates')

        # Check housing address
        housing_has_coords = (housing_lat is not None and housing_lon is not None)
        housing_classification = "FRANCE"  # Default for addresses with coordinates

        if housing_address:
            if not housing_has_coords:
                # No coordinates → potentially foreign → test
                housing_classification = self.detect_country_simple(housing_address)
                # Count housing without coords (not processed in process_foreign_owners)
                self.stats['addresses_without_coords'] += 1
                if housing_classification == "FRANCE":
                    self.stats['france_detected'] += 1
                self.log_classification(owner_id, housing_id, 'housing', housing_address,
                                      False, housing_classification, housing_postal, 'country_detector')
            else:
                # With coordinates → French → no test needed
                self.stats['addresses_with_coords'] += 1
                self.log_classification(owner_id, housing_id, 'housing', housing_address,
                                      True, 'FRANCE', housing_postal, 'has_coordinates')

        # If at least one address is foreign → Rule 6
        if owner_classification == "FOREIGN" or housing_classification == "FOREIGN":
            self.stats['foreign_detected'] += 1
            return distance, 6

        # Otherwise, French addresses → apply geographic rules

        # Calculate distance if both have coordinates
        if owner_has_coords and housing_has_coords:
            distance = self.haversine_distance(owner_lat, owner_lon, housing_lat, housing_lon)
            self.stats['distances_calculated'] += 1

        # Apply geographic rules: prefer postal_code, fallback to geo_code
        if owner_postal and housing_postal:
            classification = self.calculate_french_geographic_rules(owner_postal, housing_postal)
            self.stats['geographic_rules_applied'] += 1
        elif owner_geo_code and housing_geo_code:
            # Fallback: use geo_code to derive postal code prefix
            classification = self.calculate_french_geographic_rules_from_geocode(owner_geo_code, housing_geo_code)
            self.stats['geographic_rules_applied'] += 1
        else:
            # Default classification when data is incomplete
            classification = 7

        return distance, classification

    def calculate_french_geographic_rules_from_geocode(self, owner_geo_code: str, housing_geo_code: str) -> int:
        """Calculate French geographic classification rules using geo_code (INSEE commune codes)."""

        # Rule 1: Same commune (same geo_code)
        if owner_geo_code == housing_geo_code:
            return 1

        # Rule 2: Same department (first 2 digits for most, first 3 for Corsica)
        # Handle Corsica (2A and 2B)
        owner_dept = owner_geo_code[:3] if owner_geo_code.startswith('2') else owner_geo_code[:2]
        housing_dept = housing_geo_code[:3] if housing_geo_code.startswith('2') else housing_geo_code[:2]

        if owner_dept == housing_dept:
            return 2

        # For remaining rules, we need to map geo_code to postal_code equivalent
        # Extract department code for region checks
        owner_dept_for_region = owner_geo_code[:2]
        housing_dept_for_region = housing_geo_code[:2]

        # Rule 3: Same region (using department prefix)
        if self.same_region_from_dept(owner_dept_for_region, housing_dept_for_region):
            return 3

        # Rule 4: Different regions and owner is in metropolitan regions
        if self.is_metro_region_from_dept(owner_dept_for_region):
            return 4

        # Rule 5: Owner is in DOM-TOM regions
        if self.is_overseas_region_from_dept(owner_dept_for_region):
            return 5

        # Rule 7: Default
        return 7

    def calculate_french_geographic_rules(self, owner_postal: str, housing_postal: str) -> int:
        """Calculate French geographic classification rules."""

        # Rule 1: Same postal code
        if owner_postal == housing_postal:
            return 1

        # Rule 2: Same department (first 2 digits)
        owner_dept = owner_postal[:2]
        housing_dept = housing_postal[:2]
        if owner_dept == housing_dept:
            return 2

        # Rule 3: Same region
        if self.same_region(owner_postal, housing_postal):
            return 3

        # Rule 4: Different regions and owner is in metropolitan regions
        if self.is_metro_region(owner_postal):
            return 4

        # Rule 5: Owner is in DOM-TOM regions
        if self.is_overseas_region(owner_postal):
            return 5

        # Rule 7: Default
        return 7

    def load_regions(self):
        """Load metropolitan and overseas regions (using hardcoded values for performance)."""
        if self.metro_regions is not None and self.overseas_regions is not None:
            return

        # Use hardcoded values instead of API call for better performance
        # These are stable administrative divisions that rarely change
        self.metro_regions = ['11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94']
        self.overseas_regions = ['01', '02', '03', '04', '06']

        logging.info(f"Loaded {len(self.metro_regions)} metropolitan regions and {len(self.overseas_regions)} overseas regions (from cache)")

    def same_region(self, postal_code1: str, postal_code2: str) -> bool:
        """Check if two postal codes are in the same region."""
        self.load_regions()
        region1 = self.get_region_from_postal_code(postal_code1)
        region2 = self.get_region_from_postal_code(postal_code2)
        return region1 == region2 and region1 is not None

    def is_metro_region(self, postal_code: str) -> bool:
        """Check if postal code is in metropolitan region."""
        self.load_regions()
        region = self.get_region_from_postal_code(postal_code)
        return region in self.metro_regions if region else False

    def is_overseas_region(self, postal_code: str) -> bool:
        """Check if postal code is in overseas region."""
        self.load_regions()
        region = self.get_region_from_postal_code(postal_code)
        return region in self.overseas_regions if region else False

    def same_region_from_dept(self, dept1: str, dept2: str) -> bool:
        """Check if two department codes are in the same region."""
        self.load_regions()
        region1 = self.get_region_from_dept(dept1)
        region2 = self.get_region_from_dept(dept2)
        return region1 == region2 and region1 is not None

    def is_metro_region_from_dept(self, dept: str) -> bool:
        """Check if department code is in metropolitan region."""
        self.load_regions()
        region = self.get_region_from_dept(dept)
        return region in self.metro_regions if region else False

    def is_overseas_region_from_dept(self, dept: str) -> bool:
        """Check if department code is in overseas region."""
        self.load_regions()
        region = self.get_region_from_dept(dept)
        return region in self.overseas_regions if region else False

    def get_region_from_dept(self, dept: str) -> Optional[str]:
        """Get region code from department code."""
        if not dept:
            return None

        # Mapping based on French administrative divisions
        dept_to_region = {
            '01': '84', '02': '32', '03': '84', '04': '93', '05': '93', '06': '93', '07': '84', '08': '44',
            '09': '76', '10': '44', '11': '76', '12': '76', '13': '93', '14': '28', '15': '84', '16': '75',
            '17': '75', '18': '24', '19': '75', '20': '94', '2A': '94', '2B': '94', '21': '27', '22': '53',
            '23': '75', '24': '75', '25': '27', '26': '84', '27': '28', '28': '24', '29': '53', '30': '76',
            '31': '76', '32': '76', '33': '75', '34': '76', '35': '53', '36': '24', '37': '24', '38': '84',
            '39': '27', '40': '75', '41': '24', '42': '84', '43': '84', '44': '52', '45': '24', '46': '76',
            '47': '75', '48': '76', '49': '52', '50': '28', '51': '44', '52': '44', '53': '52', '54': '44',
            '55': '44', '56': '53', '57': '44', '58': '27', '59': '32', '60': '32', '61': '28', '62': '32',
            '63': '84', '64': '75', '65': '76', '66': '76', '67': '44', '68': '44', '69': '84', '70': '27',
            '71': '27', '72': '52', '73': '84', '74': '84', '75': '11', '76': '28', '77': '11', '78': '11',
            '79': '75', '80': '32', '81': '76', '82': '76', '83': '93', '84': '93', '85': '52', '86': '75',
            '87': '75', '88': '44', '89': '27', '90': '27', '91': '11', '92': '11', '93': '11', '94': '11',
            '95': '11', '971': '01', '972': '02', '973': '03', '974': '04', '976': '06'  # DOM-TOM
        }

        return dept_to_region.get(dept)

    def get_region_from_postal_code(self, postal_code: str) -> Optional[str]:
        """Get region code from postal code."""
        if not postal_code or len(postal_code) < 2:
            return None

        # Try 3 digits first for DOM-TOM (971, 972, 973, 974, 976)
        if len(postal_code) >= 3:
            dept_3 = postal_code[:3]
            region = self.get_region_from_dept(dept_3)
            if region:
                return region

        # Fallback to 2 digits for metropolitan France
        dept = postal_code[:2]
        return self.get_region_from_dept(dept)

    def process_foreign_owners(self, limit: int = None):
        """Process owners without coordinates for foreign detection."""
        print("\n🌍 Processing owners without coordinates...")

        # Get owners without coordinates
        owners = self.get_owners_without_coordinates(limit)

        if not owners:
            return {}

        foreign_owners = set()

        # Test each owner address
        with tqdm(owners, desc="Detecting foreign owners", unit="owner") as progress_bar:
            for owner in progress_bar:
                try:
                    classification = self.detect_country_simple(owner['owner_address'])
                    self.stats['addresses_without_coords'] += 1

                    if classification == "FOREIGN":
                        foreign_owners.add(owner['owner_id'])
                        self.stats['foreign_detected'] += 1
                    else:
                        self.stats['france_detected'] += 1

                except Exception as e:
                    logging.debug(f"Error processing owner {owner['owner_id']}: {e}")
                    self.stats['errors'] += 1

        print(f"✅ Found {len(foreign_owners)} foreign owners")
        return foreign_owners

    def run(self, limit: int = None, force: bool = False):
        """Main execution method."""
        print("="*80)
        print("OWNER-HOUSING DISTANCE CALCULATOR")
        print("="*80)
        print(f"Limit: {limit:,} pairs" if limit else "Processing all pairs")
        if force:
            print("⚠️  FORCE MODE: Recalculating ALL pairs (ignoring existing values)")

        self.connect()

        try:
            # STEP 1: Detect foreign owners
            foreign_owners = self.process_foreign_owners(limit)

            # STEP 2: Get all pairs to process
            all_pairs = self.get_all_owner_housing_pairs(limit, force)
            print(f"\n📋 Processing {len(all_pairs):,} owner-housing pairs")

            if not all_pairs:
                print("✅ Nothing to process")
                return

            # STEP 3: Process pairs in batches to avoid loading all addresses at once
            pair_batch_size = 50000  # Process 50k pairs at a time

            print("\n🔄 Processing pairs in batches...")
            num_batches = (len(all_pairs) - 1) // pair_batch_size + 1

            for batch_idx in range(num_batches):
                start_idx = batch_idx * pair_batch_size
                end_idx = min(start_idx + pair_batch_size, len(all_pairs))
                batch_pairs = all_pairs[start_idx:end_idx]

                # Check if this batch is already processed (resume capability)
                # Skip this check if force mode is enabled
                if not force:
                    sample_size = min(10, len(batch_pairs))
                    sample_pairs = batch_pairs[:sample_size]

                    already_processed = 0
                    for pair in sample_pairs:
                        if pair['locprop_distance_ban'] is not None and pair['locprop_relative_ban'] is not None:
                            already_processed += 1

                    # If more than 80% of sample is processed, skip this batch
                    if already_processed > sample_size * 0.8:
                        print(f"⏭️  Skipping batch {batch_idx+1}/{num_batches} (already processed)")
                        self.stats['processed_pairs'] += len(batch_pairs)
                        continue

                # Load addresses only for this batch
                print(f"📦 Loading addresses for batch {batch_idx+1}/{num_batches}...")
                address_cache = self.batch_get_address_data(batch_pairs)
                print(f"✅ Loaded {len(address_cache)} addresses")

                batch_updates = []

                # Process pairs in this batch
                with tqdm(batch_pairs, desc=f"Batch {batch_idx+1}/{num_batches}", unit="pair") as progress_bar:
                    for pair in progress_bar:
                        owner_id = pair['owner_id']
                        housing_id = pair['housing_id']

                        # Skip if already processed (individual level check)
                        if pair['locprop_distance_ban'] is not None and pair['locprop_relative_ban'] is not None:
                            self.stats['processed_pairs'] += 1
                            continue

                        try:
                            # Get data from cache
                            owner_data = address_cache.get((owner_id, 'Owner'))
                            housing_data = address_cache.get((housing_id, 'Housing'))

                            owner_has_coords = owner_data and owner_data[2] is not None and owner_data[3] is not None
                            housing_has_coords = housing_data and housing_data[2] is not None and housing_data[3] is not None

                            # Count coordinate combinations
                            if owner_has_coords and housing_has_coords:
                                self.stats['pairs_with_both_coords'] += 1
                            elif owner_has_coords and not housing_has_coords:
                                self.stats['pairs_with_owner_coords_only'] += 1
                            elif not owner_has_coords and housing_has_coords:
                                self.stats['pairs_with_housing_coords_only'] += 1
                            else:
                                self.stats['pairs_with_no_coords'] += 1

                            # Calculate distance and classification
                            if owner_id in foreign_owners:
                                if owner_has_coords and housing_has_coords:
                                    distance = self.haversine_distance(
                                        owner_data[2], owner_data[3], housing_data[2], housing_data[3]
                                    )
                                    self.stats['distances_calculated'] += 1
                                else:
                                    distance = None
                                classification = 6
                            else:
                                distance, classification = self.process_single_pair(owner_id, housing_id, address_cache)

                            batch_updates.append({
                                'owner_id': owner_id,
                                'housing_id': housing_id,
                                'distance': distance,
                                'classification': classification
                            })

                            self.stats['processed_pairs'] += 1

                        except Exception as e:
                            logging.debug(f"Error processing pair {owner_id}-{housing_id}: {e}")
                            self.stats['errors'] += 1

                # Save to database after each batch
                if batch_updates:
                    self.update_database(batch_updates)

                print(f"✅ Batch {batch_idx+1}/{num_batches} completed\n")

            # Final statistics
            self.print_final_statistics()

        finally:
            self.disconnect()

    def _update_batch_worker(self, batch_data: tuple) -> tuple:
        """Worker function to update a single batch in parallel"""
        batch_id, batch, db_config = batch_data

        import math
        import time
        import threading
        from psycopg2.extras import execute_values

        start_time = time.time()
        thread_id = threading.current_thread().name

        conn = None
        try:
            # Create dedicated connection for this worker
            conn_start = time.time()
            conn = psycopg2.connect(db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Use asynchronous commits for better performance (safe for bulk processing)
            # Each batch still commits independently, just faster
            cursor.execute("SET synchronous_commit = off")

            conn_time = time.time() - conn_start

            # Prepare bulk update data
            prep_start = time.time()
            update_data = []
            for update in batch:
                distance = update['distance']
                if distance is None or (isinstance(distance, float) and (math.isnan(distance) or math.isinf(distance))):
                    distance_int = None
                else:
                    distance_int = int(round(distance * 1000))

                update_data.append((
                    distance_int,
                    update['classification'],
                    update['owner_id'],
                    update['housing_id']
                ))
            prep_time = time.time() - prep_start

            # Execute bulk update
            exec_start = time.time()
            execute_values(
                cursor,
                """
                UPDATE owners_housing AS oh
                SET locprop_distance_ban = CASE WHEN data.distance IS NULL THEN NULL ELSE data.distance::integer END,
                    locprop_relative_ban = data.classification::integer
                FROM (VALUES %s) AS data(distance, classification, owner_id, housing_id)
                WHERE oh.owner_id = data.owner_id::uuid
                  AND oh.housing_id = data.housing_id::uuid
                """,
                update_data,
                page_size=1000
            )
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
                logging.info(f"[{thread_id}] Batch #{batch_id+1}: {len(batch)} records in {total_time:.2f}s "
                           f"(conn:{conn_time:.2f}s prep:{prep_time:.2f}s exec:{exec_time:.2f}s commit:{commit_time:.2f}s) "
                           f"✓ Independent commit completed")

            return (batch_id, len(batch), None)

        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                    conn.close()
                except:
                    pass
            return (batch_id, 0, str(e))

    def update_database(self, updates: List, num_workers: int = 6):
        """
        Update database with parallel bulk operations.

        Args:
            updates: List of updates to process
            num_workers: Number of parallel workers (default: 6, recommended: 2-16)
        """
        print("\n💾 Updating database...")

        if not updates:
            print("⚠️ No updates to process")
            return

        total_updates = 0
        total_errors = 0
        batch_size = 10000

        # Split updates into batches
        batches = []
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i + batch_size]
            # Pass the original db_url string, not conn.dsn which may not have password
            batches.append((i // batch_size, batch, self.db_url))

        print(f"Processing {len(batches)} batches with {num_workers} parallel workers...")

        # Process batches in parallel
        from concurrent.futures import ThreadPoolExecutor, as_completed

        completed_batches = 0

        with tqdm(total=len(updates), desc="Saving to database", unit="record",
                 bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}] {postfix}') as pbar:
            with ThreadPoolExecutor(max_workers=num_workers) as executor:
                futures = {executor.submit(self._update_batch_worker, batch_data): batch_data for batch_data in batches}

                for future in as_completed(futures):
                    batch_id, updated_count, error = future.result()
                    completed_batches += 1

                    if error:
                        batch_size_for_error = len(batches[batch_id][1])
                        total_errors += batch_size_for_error
                        logging.error(f"Error updating batch {batch_id + 1}: {error}")
                        pbar.update(batch_size_for_error)
                    else:
                        total_updates += updated_count
                        pbar.update(updated_count)

                    # Show active workers and stats
                    batches_remaining = len(batches) - completed_batches
                    active_workers = min(num_workers, batches_remaining)

                    pbar.set_postfix({
                        'completed': f"{completed_batches}/{len(batches)}",
                        'last': f"#{batch_id+1}",
                        'workers': f"{active_workers}↻" if active_workers > 0 else "✓",
                        'err': total_errors if total_errors > 0 else 0
                    })

        print(f"✅ Updated {total_updates:,} records" + (f" ({total_errors:,} errors)" if total_errors > 0 else ""))

    def print_final_statistics(self):
        """Print final statistics."""
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)

        print(f"Pairs processed: {self.stats['processed_pairs']:,}")
        print(f"Distances calculated: {self.stats['distances_calculated']:,}")
        print(f"Geographic rules applied: {self.stats['geographic_rules_applied']:,}")

        if self.stats['errors'] > 0:
            print(f"⚠️  Errors: {self.stats['errors']:,}")

        print("="*80)


def setup_logging(verbose: bool = False):
    """Setup logging configuration."""
    logging.basicConfig(
        level=logging.INFO if verbose else logging.WARNING,
        format='%(levelname)s - %(message)s'
    )


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Calculate distances between owners and their housing properties"
    )
    parser.add_argument(
        "--db-url",
        default='postgres://postgres:postgres@localhost:5433/copieprod',
        help="Database connection URL"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit the number of owner-housing pairs to process"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force overwrite existing values in database (recalculate all data)"
    )

    args = parser.parse_args()

    # Enable verbose logging for first 10 batches to verify parallelism
    setup_logging(verbose=True)

    # Initialize calculator
    calculator = DistanceCalculator(args.db_url)

    try:
        calculator.run(args.limit, args.force)
        print("\n✅ Completed successfully")
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()