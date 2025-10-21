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
        print("🔧 Initializing CountryDetector...")
        self.country_detector = CountryDetector(model_name="rule-based", use_llm=False)

        # Check version
        detector_version = self.country_detector.get_version()
        print(f"🔧 CountryDetector version: {detector_version}")

        # Validation tests
        print("🧪 Running validation tests:")
        test_result = self.country_detector.detect_country("25 SE 41253 BENZELIIGATAN GOTEBORG SUEDE")
        if test_result != "FOREIGN":
            print(f"❌ ALERT: CountryDetector malfunction - Swedish address classified as {test_result} instead of FOREIGN")
            sys.exit(1)
        else:
            print("✅ CountryDetector validation passed: corrections are active")

        # Reset statistics after tests
        self.country_detector.reset_statistics()

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
        """Setup CSV logging for address classifications."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        os.makedirs("logs", exist_ok=True)

        # Classification CSV
        classification_csv_path = os.path.join("logs", f"address_classifications_{timestamp}.csv")
        try:
            self.classification_csv_file = open(classification_csv_path, 'w', newline='', encoding='utf-8')
            self.classification_csv_writer = csv.writer(self.classification_csv_file)
            self.classification_csv_writer.writerow([
                'timestamp', 'owner_id', 'housing_id', 'address_type', 'address',
                'has_coordinates', 'classification', 'postal_code', 'test_method'
            ])
            print(f"📊 Address classification CSV: {classification_csv_path}")
        except Exception as e:
            print(f"❌ Failed to initialize classification CSV: {e}")
            self.classification_csv_file = None
            self.classification_csv_writer = None

    def log_classification(self, owner_id: str, housing_id: str, address_type: str,
                         address: str, has_coords: bool, classification: str,
                         postal_code: str = None, test_method: str = None):
        """Log address classification to CSV."""
        if not self.classification_csv_writer:
            return

        try:
            self.classification_csv_writer.writerow([
                datetime.now().isoformat(), owner_id, housing_id, address_type,
                address if address else '', has_coords, classification,
                postal_code if postal_code else '', test_method if test_method else ''
            ])
            self.classification_csv_file.flush()
        except Exception as e:
            logging.debug(f"Failed to log classification: {e}")

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print("✅ Database connection established")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            raise

    def disconnect(self):
        """Close database connection and CSV files."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        if self.classification_csv_file:
            self.classification_csv_file.close()
        print("✅ Database connection closed")

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

    def get_all_owner_housing_pairs(self, limit: int = None):
        """Get all owner-housing pairs that need processing with random sampling when limit is given."""
        try:
            if limit:
                # Use random sampling with subquery to avoid DISTINCT + ORDER BY issue
                query = """
                    SELECT
                        owner_id,
                        housing_id,
                        locprop_distance_ban,
                        locprop_relative_ban
                    FROM (
                        SELECT DISTINCT
                            oh.owner_id,
                            oh.housing_id,
                            oh.locprop_distance_ban,
                            oh.locprop_relative_ban
                        FROM owners_housing oh
                        WHERE oh.locprop_distance_ban IS NULL
                           OR oh.locprop_relative_ban IS NULL
                    ) AS distinct_pairs
                    ORDER BY RANDOM()
                    LIMIT %s
                """
                self.cursor.execute(query, (limit,))
            else:
                # No sampling for full dataset
                query = """
                    SELECT DISTINCT
                        oh.owner_id,
                        oh.housing_id,
                        oh.locprop_distance_ban,
                        oh.locprop_relative_ban
                    FROM owners_housing oh
                    WHERE oh.locprop_distance_ban IS NULL
                       OR oh.locprop_relative_ban IS NULL
                """
                self.cursor.execute(query)

            return self.cursor.fetchall()
        except Exception as e:
            print(f"❌ Error fetching owner-housing pairs: {e}")
            raise

    def get_address_data(self, ref_id: str, address_kind: str) -> Optional[Tuple[str, str, float, float]]:
        """Get address data including postal code, address, lat, lon."""
        try:
            self.cursor.execute("""
                SELECT postal_code, address, latitude, longitude
                FROM ban_addresses
                WHERE ref_id = %s AND address_kind = %s
                AND postal_code IS NOT NULL
            """, (ref_id, address_kind))

            result = self.cursor.fetchone()
            if result:
                return (result['postal_code'], result['address'],
                       result['latitude'], result['longitude'])
            return None
        except Exception as e:
            logging.debug(f"Error getting address data for {ref_id}: {e}")
            return None

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula."""
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radius of Earth in kilometers
        return c * r

    def process_single_pair(self, owner_id: str, housing_id: str) -> Tuple[Optional[float], int]:
        """
        Process a single owner-housing pair with correct logic.
        """

        # Get address data (note: address_kind values are capitalized)
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
        owner_postal = owner_address = owner_lat = owner_lon = None
        housing_postal = housing_address = housing_lat = housing_lon = None

        if owner_data:
            owner_postal, owner_address, owner_lat, owner_lon = owner_data
        if housing_data:
            housing_postal, housing_address, housing_lat, housing_lon = housing_data

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

        # Apply geographic rules only if both postal codes are available
        if owner_postal and housing_postal:
            classification = self.calculate_french_geographic_rules(owner_postal, housing_postal)
            self.stats['geographic_rules_applied'] += 1
        else:
            # Default classification when data is incomplete
            classification = 7

        return distance, classification

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
        """Load metropolitan and overseas regions from API."""
        if self.metro_regions is not None and self.overseas_regions is not None:
            return

        try:
            response = requests.get("https://geo.api.gouv.fr/regions", timeout=10)
            response.raise_for_status()
            regions = response.json()

            self.metro_regions = []
            self.overseas_regions = []

            for region in regions:
                if region['code'] in ['01', '02', '03', '04', '06']:  # DOM-TOM codes
                    self.overseas_regions.append(region['code'])
                else:
                    self.metro_regions.append(region['code'])

            logging.info(f"Loaded {len(self.metro_regions)} metropolitan regions and {len(self.overseas_regions)} overseas regions")
        except Exception as e:
            logging.warning(f"Failed to load regions from API: {e}")
            # Fallback to hardcoded values
            self.metro_regions = ['11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94']
            self.overseas_regions = ['01', '02', '03', '04', '06']

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

    def get_region_from_postal_code(self, postal_code: str) -> Optional[str]:
        """Get region code from postal code."""
        if not postal_code or len(postal_code) < 2:
            return None

        dept = postal_code[:2]

        # Mapping based on French administrative divisions
        dept_to_region = {
            '01': '84', '02': '32', '03': '84', '04': '93', '05': '93', '06': '93', '07': '84', '08': '44',
            '09': '76', '10': '44', '11': '76', '12': '76', '13': '93', '14': '28', '15': '84', '16': '75',
            '17': '75', '18': '24', '19': '75', '20': '94', '21': '27', '22': '53', '23': '75', '24': '75',
            '25': '27', '26': '84', '27': '28', '28': '24', '29': '53', '30': '76', '31': '76', '32': '76',
            '33': '75', '34': '76', '35': '53', '36': '24', '37': '24', '38': '84', '39': '27', '40': '75',
            '41': '24', '42': '84', '43': '84', '44': '52', '45': '24', '46': '76', '47': '75', '48': '76',
            '49': '52', '50': '28', '51': '44', '52': '44', '53': '52', '54': '44', '55': '44', '56': '53',
            '57': '44', '58': '27', '59': '32', '60': '32', '61': '28', '62': '32', '63': '84', '64': '75',
            '65': '76', '66': '76', '67': '44', '68': '44', '69': '84', '70': '27', '71': '27', '72': '52',
            '73': '84', '74': '84', '75': '11', '76': '28', '77': '11', '78': '11', '79': '75', '80': '32',
            '81': '76', '82': '76', '83': '93', '84': '93', '85': '52', '86': '75', '87': '75', '88': '44',
            '89': '27', '90': '27', '91': '11', '92': '11', '93': '11', '94': '11', '95': '11',
            '971': '01', '972': '02', '973': '03', '974': '04', '976': '06'  # DOM-TOM
        }

        return dept_to_region.get(dept)

    def process_foreign_owners(self, limit: int = None):
        """Process owners without coordinates for foreign detection."""
        print("\n🌍 PROCESSING OWNERS WITHOUT COORDINATES")
        print("="*60)

        # Get owners without coordinates
        owners = self.get_owners_without_coordinates(limit)
        print(f"Owners without coordinates to test: {len(owners)}")

        if not owners:
            print("✅ No owners without coordinates")
            return {}

        foreign_owners = set()

        # Test each owner address
        with tqdm(owners, desc="Testing owner addresses") as progress_bar:
            for owner in progress_bar:
                owner_id = owner['owner_id']
                owner_address = owner['owner_address']
                owner_postal = owner['owner_postal_code']

                try:
                    classification = self.detect_country_simple(owner_address)
                    self.stats['addresses_without_coords'] += 1

                    # Log classification
                    self.log_classification(
                        owner_id, "N/A", 'owner', owner_address,
                        False, classification, owner_postal, 'country_detector'
                    )

                    if classification == "FOREIGN":
                        foreign_owners.add(owner_id)
                        self.stats['foreign_detected'] += 1
                    else:
                        self.stats['france_detected'] += 1

                    # Update progress bar
                    progress_bar.set_postfix({
                        'tested': self.stats['addresses_without_coords'],
                        'foreign': self.stats['foreign_detected'],
                        'france': self.stats['france_detected']
                    })

                except Exception as e:
                    logging.error(f"Error processing owner {owner_id}: {e}")
                    self.stats['errors'] += 1

        print(f"✅ Foreign owners detected: {len(foreign_owners)}")
        return foreign_owners

    def run(self, limit: int = None, force: bool = False):
        """Main execution method."""
        print("="*80)
        print("CALCULATE DISTANCES - OWNER-HOUSING DISTANCE CALCULATOR")
        print("="*80)
        print("📍 PRINCIPLE: Process OWNERS without coordinates")
        print("📍 1. All owners without coordinates → country_detector")
        print("📍 2. Mark all pairs of foreign owners as Rule 6")
        print("📍 3. Process other pairs normally")
        print(f"Mode: {'Force recalculation' if force else 'Only missing values'}")
        print(f"Limit: {limit if limit else 'No limit'}")

        self.connect()

        try:
            # STEP 1: Process owners without coordinates for foreign detection
            foreign_owners = self.process_foreign_owners(limit)

            # STEP 2: Get all pairs to process
            pairs = self.get_all_owner_housing_pairs(limit)
            print(f"\n📋 Pairs to process: {len(pairs)}")
            if limit:
                print(f"🎲 Random sampling enabled (ORDER BY RANDOM())")

            # Debug: SQL analysis of coordinate availability
            print(f"🔍 DIRECT SQL ANALYSIS OF BAN COVERAGE:")
            try:
                # Count coordinate availability patterns directly in SQL
                if limit:
                    analysis_query = """
                    WITH distinct_pairs AS (
                        SELECT DISTINCT oh.owner_id, oh.housing_id
                        FROM owners_housing oh
                        WHERE oh.locprop_distance_ban IS NULL OR oh.locprop_relative_ban IS NULL
                    ),
                    sampled_pairs AS (
                        SELECT * FROM distinct_pairs ORDER BY RANDOM() LIMIT %s
                    ),
                    coord_analysis AS (
                        SELECT
                            sp.owner_id,
                            sp.housing_id,
                            CASE WHEN o_ban.latitude IS NOT NULL AND o_ban.longitude IS NOT NULL THEN 1 ELSE 0 END as owner_has_coords,
                            CASE WHEN h_ban.latitude IS NOT NULL AND h_ban.longitude IS NOT NULL THEN 1 ELSE 0 END as housing_has_coords
                        FROM sampled_pairs sp
                        LEFT JOIN ban_addresses o_ban ON o_ban.ref_id = sp.owner_id AND o_ban.address_kind = 'Owner'
                        LEFT JOIN ban_addresses h_ban ON h_ban.ref_id = sp.housing_id AND h_ban.address_kind = 'Housing'
                    )
                    SELECT
                        SUM(CASE WHEN owner_has_coords = 1 AND housing_has_coords = 1 THEN 1 ELSE 0 END) as both_coords,
                        SUM(CASE WHEN owner_has_coords = 1 AND housing_has_coords = 0 THEN 1 ELSE 0 END) as owner_only,
                        SUM(CASE WHEN owner_has_coords = 0 AND housing_has_coords = 1 THEN 1 ELSE 0 END) as housing_only,
                        SUM(CASE WHEN owner_has_coords = 0 AND housing_has_coords = 0 THEN 1 ELSE 0 END) as no_coords,
                        COUNT(*) as total
                    FROM coord_analysis
                    """
                    self.cursor.execute(analysis_query, (limit,))
                else:
                    analysis_query = """
                    WITH coord_analysis AS (
                        SELECT DISTINCT
                            oh.owner_id,
                            oh.housing_id,
                            CASE WHEN o_ban.latitude IS NOT NULL AND o_ban.longitude IS NOT NULL THEN 1 ELSE 0 END as owner_has_coords,
                            CASE WHEN h_ban.latitude IS NOT NULL AND h_ban.longitude IS NOT NULL THEN 1 ELSE 0 END as housing_has_coords
                        FROM owners_housing oh
                        LEFT JOIN ban_addresses o_ban ON o_ban.ref_id = oh.owner_id AND o_ban.address_kind = 'Owner'
                        LEFT JOIN ban_addresses h_ban ON h_ban.ref_id = oh.housing_id AND h_ban.address_kind = 'Housing'
                        WHERE oh.locprop_distance_ban IS NULL OR oh.locprop_relative_ban IS NULL
                    )
                    SELECT
                        SUM(CASE WHEN owner_has_coords = 1 AND housing_has_coords = 1 THEN 1 ELSE 0 END) as both_coords,
                        SUM(CASE WHEN owner_has_coords = 1 AND housing_has_coords = 0 THEN 1 ELSE 0 END) as owner_only,
                        SUM(CASE WHEN owner_has_coords = 0 AND housing_has_coords = 1 THEN 1 ELSE 0 END) as housing_only,
                        SUM(CASE WHEN owner_has_coords = 0 AND housing_has_coords = 0 THEN 1 ELSE 0 END) as no_coords,
                        COUNT(*) as total
                    FROM coord_analysis
                    """
                    self.cursor.execute(analysis_query)

                sql_result = self.cursor.fetchone()

                if sql_result:
                    print(f"  SQL Analysis:")
                    print(f"    Both coords: {sql_result['both_coords']} ({(sql_result['both_coords']/sql_result['total']*100):.1f}%)")
                    print(f"    Owner only:  {sql_result['owner_only']} ({(sql_result['owner_only']/sql_result['total']*100):.1f}%)")
                    print(f"    Housing only: {sql_result['housing_only']} ({(sql_result['housing_only']/sql_result['total']*100):.1f}%)")
                    print(f"    No coords:   {sql_result['no_coords']} ({(sql_result['no_coords']/sql_result['total']*100):.1f}%)")
                    print(f"    Total pairs: {sql_result['total']}")

                    if sql_result['both_coords'] > 0:
                        print(f"  ✅ SQL shows {sql_result['both_coords']} pairs with both coords")
                    else:
                        print(f"  ⚠️  SQL confirms 0 pairs with both coords - data coverage issue")

            except Exception as e:
                print(f"  ❌ SQL analysis failed: {e}")

            # Debug: Analyze what these pairs look like
            if pairs and len(pairs) > 0:
                print(f"\n🔍 SAMPLE OF FIRST PAIRS:")
                for i, pair in enumerate(pairs[:3]):
                    print(f"  Pair {i+1}: owner={pair['owner_id'][:8]}... housing={pair['housing_id'][:8]}...")
                    # Quick check of their data availability
                    owner_data = self.get_address_data(pair['owner_id'], 'Owner')
                    housing_data = self.get_address_data(pair['housing_id'], 'Housing')
                    owner_status = "COORDS" if owner_data and owner_data[2] is not None else "NO_COORDS" if owner_data else "NOT_FOUND"
                    housing_status = "COORDS" if housing_data and housing_data[2] is not None else "NO_COORDS" if housing_data else "NOT_FOUND"
                    print(f"    └── Owner: {owner_status}, Housing: {housing_status}")
                print("="*60)

            if not pairs:
                print("✅ Nothing to process")
                return

            updates = []

            # Process each pair
            print(f"\n🔄 PROCESSING PAIRS")
            with tqdm(pairs, desc="Processing pairs") as progress_bar:
                for pair in progress_bar:
                    owner_id = pair['owner_id']
                    housing_id = pair['housing_id']

                    try:
                        # Count coordinate combinations for ALL pairs
                        owner_data = self.get_address_data(owner_id, 'Owner')
                        housing_data = self.get_address_data(housing_id, 'Housing')

                        # Debug logging every 100 pairs to understand data availability
                        if self.stats['processed_pairs'] % 100 == 0:
                            logging.info(f"SAMPLE PAIR {self.stats['processed_pairs']}: owner_id={owner_id[:8]}... housing_id={housing_id[:8]}...")
                            if owner_data:
                                logging.info(f"  Owner data: postal={owner_data[0]}, address_len={len(owner_data[1]) if owner_data[1] else 0}, lat={owner_data[2]}, lon={owner_data[3]}")
                            else:
                                logging.info(f"  Owner data: None (not found in BAN)")
                            if housing_data:
                                logging.info(f"  Housing data: postal={housing_data[0]}, address_len={len(housing_data[1]) if housing_data[1] else 0}, lat={housing_data[2]}, lon={housing_data[3]}")
                            else:
                                logging.info(f"  Housing data: None (not found in BAN)")

                        owner_has_coords = owner_data and owner_data[2] is not None and owner_data[3] is not None
                        housing_has_coords = housing_data and housing_data[2] is not None and housing_data[3] is not None

                        # Count coordinate combinations for ALL pairs
                        if owner_has_coords and housing_has_coords:
                            self.stats['pairs_with_both_coords'] += 1
                            # Log first few cases with both coords for analysis
                            if self.stats['pairs_with_both_coords'] <= 5:
                                logging.info(f"BOTH COORDS FOUND #{self.stats['pairs_with_both_coords']}: {owner_id[:8]}.../{housing_id[:8]}...")
                                logging.info(f"  Owner: {owner_data[1][:50]}... ({owner_data[2]:.6f}, {owner_data[3]:.6f})")
                                logging.info(f"  Housing: {housing_data[1][:50]}... ({housing_data[2]:.6f}, {housing_data[3]:.6f})")
                        elif owner_has_coords and not housing_has_coords:
                            self.stats['pairs_with_owner_coords_only'] += 1
                        elif not owner_has_coords and housing_has_coords:
                            self.stats['pairs_with_housing_coords_only'] += 1
                        else:
                            self.stats['pairs_with_no_coords'] += 1

                        # If owner is already known to be foreign, mark as Rule 6
                        if owner_id in foreign_owners:
                            # Calculate distance if both have coordinates, even for foreign owners
                            if owner_has_coords and housing_has_coords:
                                distance = self.haversine_distance(
                                    owner_data[2], owner_data[3], housing_data[2], housing_data[3]
                                )
                                self.stats['distances_calculated'] += 1
                            else:
                                distance = None
                            classification = 6
                            self.stats['foreign_detected'] += 1  # Count pair as foreign
                        else:
                            # Normal processing for non-foreign owners
                            distance, classification = self.process_single_pair(owner_id, housing_id)

                        updates.append({
                            'owner_id': owner_id,
                            'housing_id': housing_id,
                            'distance': distance,
                            'classification': classification
                        })

                        self.stats['processed_pairs'] += 1

                        # Update progress bar with real-time stats
                        progress_bar.set_postfix({
                            'foreign_owners': len(foreign_owners),
                            'processed': self.stats['processed_pairs'],
                            'rule6': sum(1 for u in updates if u['classification'] == 6)
                        })

                    except Exception as e:
                        logging.error(f"Error processing pair {owner_id}-{housing_id}: {e}")
                        self.stats['errors'] += 1

            # Update database
            self.update_database(updates)

            # Final statistics
            self.print_final_statistics()

        finally:
            self.disconnect()

    def update_database(self, updates: List):
        """Update database with results using individual transactions."""
        print("\n💾 DATABASE UPDATE")
        print("="*60)

        total_updates = 0
        total_errors = 0

        with tqdm(updates, desc="Updating database") as progress_bar:
            for update in progress_bar:
                try:
                    # Each UPDATE in its own transaction to avoid cascade failures
                    self.cursor.execute("""
                        UPDATE owners_housing
                        SET locprop_distance_ban = %s, locprop_relative_ban = %s
                        WHERE owner_id = %s AND housing_id = %s
                    """, (update['distance'], update['classification'],
                         update['owner_id'], update['housing_id']))

                    # Commit immediately
                    self.conn.commit()
                    total_updates += 1

                    # Update progress bar with real-time stats
                    progress_bar.set_postfix({
                        'success': total_updates,
                        'errors': total_errors,
                        'rate': f"{(total_updates/(total_updates+total_errors)*100):.1f}%" if (total_updates+total_errors) > 0 else "0%"
                    })

                except Exception as e:
                    # Rollback this specific transaction and continue
                    try:
                        self.conn.rollback()
                    except:
                        pass  # Ignore rollback errors

                    total_errors += 1
                    logging.debug(f"Error updating {update['owner_id']}-{update['housing_id']}: {e}")

                    # Update progress bar with real-time stats
                    progress_bar.set_postfix({
                        'success': total_updates,
                        'errors': total_errors,
                        'rate': f"{(total_updates/(total_updates+total_errors)*100):.1f}%" if (total_updates+total_errors) > 0 else "0%"
                    })

        print(f"✅ Database updated: {total_updates} records")
        if total_errors > 0:
            print(f"⚠️ Errors encountered: {total_errors} records failed")
            logging.info(f"Database update completed with {total_errors} errors out of {len(updates)} attempts")

    def print_final_statistics(self):
        """Print final statistics including CountryDetector stats."""
        print("\n" + "="*80)
        print("FINAL STATISTICS")
        print("="*80)

        total_addresses_found = self.stats['addresses_with_coords'] + self.stats['addresses_without_coords']
        expected_max_addresses = self.stats['processed_pairs'] * 2

        print("📊 PROCESSING STATISTICS:")
        print(f"  Owner-housing pairs processed: {self.stats['processed_pairs']}")
        print(f"  └── Addresses found in BAN: {total_addresses_found}/{expected_max_addresses} ({(total_addresses_found/expected_max_addresses*100):.1f}%)")
        print(f"      ├── Individual addresses with coordinates: {self.stats['addresses_with_coords']}")
        print(f"      └── Individual addresses without coordinates: {self.stats['addresses_without_coords']}")
        print(f"          ├── Classified as FRANCE (no coords): {self.stats['france_detected']}")
        print(f"          └── Classified as FOREIGN (no coords): {self.stats['foreign_detected']}")

        print(f"\n🎯 PAIR ANALYSIS (for distances and geographic rules):")
        print(f"  ├── Pairs with BOTH coords → distances calculated: {self.stats['pairs_with_both_coords']} ({(self.stats['pairs_with_both_coords']/self.stats['processed_pairs']*100):.1f}%)")
        print(f"  ├── Pairs with owner coords only: {self.stats['pairs_with_owner_coords_only']} ({(self.stats['pairs_with_owner_coords_only']/self.stats['processed_pairs']*100):.1f}%)")
        print(f"  ├── Pairs with housing coords only: {self.stats['pairs_with_housing_coords_only']} ({(self.stats['pairs_with_housing_coords_only']/self.stats['processed_pairs']*100):.1f}%)")
        print(f"  └── Pairs without coordinates: {self.stats['pairs_with_no_coords']} ({(self.stats['pairs_with_no_coords']/self.stats['processed_pairs']*100):.1f}%)")
        print(f"  Distances actually calculated: {self.stats['distances_calculated']}")
        print(f"  Geographic rules applied: {self.stats['geographic_rules_applied']}")
        print(f"  Errors: {self.stats['errors']}")

        print(f"\n🔍 BAN COVERAGE ANALYSIS:")
        total_owner_found = self.stats['pairs_with_both_coords'] + self.stats['pairs_with_owner_coords_only']
        total_housing_found = self.stats['pairs_with_both_coords'] + self.stats['pairs_with_housing_coords_only']
        print(f"  ├── Owners found in BAN with coords: {total_owner_found}/{self.stats['processed_pairs']} ({(total_owner_found/self.stats['processed_pairs']*100):.1f}%)")
        print(f"  └── Housings found in BAN with coords: {total_housing_found}/{self.stats['processed_pairs']} ({(total_housing_found/self.stats['processed_pairs']*100):.1f}%)")

        # Calculate theoretical maximum with both coords
        theoretical_max = min(total_owner_found, total_housing_found)
        print(f"  ⚠️  Theoretical maximum pairs with BOTH coords: {theoretical_max}")
        print(f"  ⚠️  Observed reality: {self.stats['pairs_with_both_coords']} (missing {theoretical_max - self.stats['pairs_with_both_coords']})")

        print(f"\n📋 DATA COVERAGE (owner_id/housing_id in BAN):")
        print(f"  Missing owner data: {self.stats['missing_owner_data']}")
        print(f"  Missing housing data: {self.stats['missing_housing_data']}")
        print(f"  Completely missing data: {self.stats['missing_both_data']}")
        print(f"  └── BAN coverage: {(total_addresses_found/(self.stats['processed_pairs']*2))*100:.1f}% of referenced addresses")

        # CountryDetector statistics
        country_stats = self.country_detector.get_statistics()
        if country_stats['total_processed'] > 0:
            print("\n🌍 COUNTRY DETECTION STATISTICS")
            print("-"*60)
            print(f"Total addresses analyzed: {country_stats['total_processed']}")
            print(f"France classifications: {country_stats['france_count']}")
            print(f"Foreign classifications: {country_stats['foreign_count']}")
            print(f"Rule-based used: {country_stats['rule_based_used']}")

            if country_stats['total_processed'] > 0:
                france_rate = (country_stats['france_count'] / country_stats['total_processed']) * 100
                foreign_rate = (country_stats['foreign_count'] / country_stats['total_processed']) * 100
                print(f"France rate: {france_rate:.1f}%")
                print(f"Foreign rate: {foreign_rate:.1f}%")

                print(f"\n🔍 ANALYSIS:")
                print(f"  • Country_detector tested on: {country_stats['total_processed']} addresses without coordinates")
                print(f"  • French addresses (with coords): {self.stats['addresses_with_coords']} (not tested)")
                print(f"  • Logic: Normal to have many more addresses with coords than without coords")

        print("="*80)


def setup_logging():
    """Setup logging configuration."""
    os.makedirs("logs", exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/calculate_distances.log'),
            logging.StreamHandler(sys.stdout)
        ]
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

    setup_logging()

    print(f"Starting distance calculation script")
    print(f"Parameters: limit={args.limit}, db_url={args.db_url}, force={args.force}")

    # Initialize calculator
    calculator = DistanceCalculator(args.db_url)

    try:
        calculator.run(args.limit, args.force)
        print("✅ Script completed successfully")
    except Exception as e:
        print(f"❌ Script failed: {e}")
        logging.error(f"Script execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()