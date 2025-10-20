#!/usr/bin/env python3
"""
Script to generate statistics report for owner-housing distances and classifications.

This script analyzes the coverage and distribution of:
- Distance calculations (locprop_distance_ban)
- Relative classifications (locprop_relative_ban) with 7 possible values:
  1. Same postal code
  2. Same department
  3. Same region
  4. Owner in metro, different regions
  5. Owner in DOM-TOM, different regions
  6. Foreign country detected
  7. Other France cases or missing data

Provides detailed statistics on data completeness and classification patterns.
"""

import argparse
import logging
import sys
import os
from datetime import datetime
from typing import Dict, List, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor

# Add the project root to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

class StatisticsReporter:
    """Generates statistics reports for owner-housing distance and classification data."""

    def __init__(self, db_url: str):
        """Initialize with database connection."""
        self.db_url = db_url
        self.conn = None
        self.cursor = None

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            logging.info("Database connection established")
        except Exception as e:
            logging.error(f"Failed to connect to database: {e}")
            raise

    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logging.info("Database connection closed")

    def get_total_records(self) -> int:
        """Get total number of records in owners_housing table."""
        try:
            self.cursor.execute("SELECT COUNT(*) as total FROM owners_housing")
            result = self.cursor.fetchone()
            return result['total']
        except Exception as e:
            logging.error(f"Error getting total records: {e}")
            return 0

    def get_distance_coverage(self) -> Dict:
        """Get coverage statistics for distance calculations."""
        try:
            # Total records with distance calculated
            self.cursor.execute("""
                SELECT COUNT(*) as calculated
                FROM owners_housing
                WHERE locprop_distance_ban IS NOT NULL
            """)
            calculated = self.cursor.fetchone()['calculated']

            # Records with valid coordinates available
            self.cursor.execute("""
                SELECT COUNT(DISTINCT (oh.owner_id, oh.housing_id)) as available
                FROM owners_housing oh
                INNER JOIN ban_addresses ba_owner ON ba_owner.ref_id = oh.owner_id
                    AND ba_owner.address_kind = 'Owner'
                    AND ba_owner.latitude IS NOT NULL
                    AND ba_owner.longitude IS NOT NULL
                INNER JOIN ban_addresses ba_housing ON ba_housing.ref_id = oh.housing_id
                    AND ba_housing.address_kind = 'Housing'
                    AND ba_housing.latitude IS NOT NULL
                    AND ba_housing.longitude IS NOT NULL
            """)
            available = self.cursor.fetchone()['available']

            return {
                'calculated': calculated,
                'available': available
            }
        except Exception as e:
            logging.error(f"Error getting distance coverage: {e}")
            return {'calculated': 0, 'available': 0}

    def get_classification_coverage(self) -> Dict:
        """Get coverage statistics for relative classifications."""
        try:
            # Total records with classification calculated
            self.cursor.execute("""
                SELECT COUNT(*) as calculated
                FROM owners_housing
                WHERE locprop_relative_ban IS NOT NULL
            """)
            calculated = self.cursor.fetchone()['calculated']

            # Records with valid postal codes available
            self.cursor.execute("""
                SELECT COUNT(DISTINCT (oh.owner_id, oh.housing_id)) as available
                FROM owners_housing oh
                INNER JOIN ban_addresses ba_owner ON ba_owner.ref_id = oh.owner_id
                    AND ba_owner.address_kind = 'Owner'
                    AND ba_owner.postal_code IS NOT NULL
                INNER JOIN ban_addresses ba_housing ON ba_housing.ref_id = oh.housing_id
                    AND ba_housing.address_kind = 'Housing'
                    AND ba_housing.postal_code IS NOT NULL
            """)
            available = self.cursor.fetchone()['available']

            return {
                'calculated': calculated,
                'available': available
            }
        except Exception as e:
            logging.error(f"Error getting classification coverage: {e}")
            return {'calculated': 0, 'available': 0}

    def get_classification_distribution(self) -> List[Dict]:
        """Get distribution of relative classification values."""
        try:
            self.cursor.execute("""
                SELECT
                    locprop_relative_ban as classification,
                    COUNT(*) as count,
                    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 2) as percentage
                FROM owners_housing
                WHERE locprop_relative_ban IS NOT NULL
                GROUP BY locprop_relative_ban
                ORDER BY locprop_relative_ban
            """)
            return self.cursor.fetchall()
        except Exception as e:
            logging.error(f"Error getting classification distribution: {e}")
            return []

    def get_distance_statistics(self) -> Dict:
        """Get statistics for distance values."""
        try:
            self.cursor.execute("""
                SELECT
                    COUNT(*) as count,
                    MIN(locprop_distance_ban) as min_distance,
                    MAX(locprop_distance_ban) as max_distance,
                    ROUND(AVG(locprop_distance_ban)::numeric, 2) as avg_distance,
                    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY locprop_distance_ban)::numeric, 2) as median_distance,
                    ROUND(STDDEV(locprop_distance_ban)::numeric, 2) as std_distance
                FROM owners_housing
                WHERE locprop_distance_ban IS NOT NULL
            """)
            return self.cursor.fetchone()
        except Exception as e:
            logging.error(f"Error getting distance statistics: {e}")
            return {}

    def get_distance_ranges(self) -> List[Dict]:
        """Get distribution of distances by ranges."""
        try:
            self.cursor.execute("""
                WITH distance_ranges AS (
                    SELECT
                        CASE
                            WHEN locprop_distance_ban = 0 THEN '0 km (même adresse)'
                            WHEN locprop_distance_ban <= 1 THEN '0-1 km'
                            WHEN locprop_distance_ban <= 5 THEN '1-5 km'
                            WHEN locprop_distance_ban <= 10 THEN '5-10 km'
                            WHEN locprop_distance_ban <= 50 THEN '10-50 km'
                            WHEN locprop_distance_ban <= 100 THEN '50-100 km'
                            WHEN locprop_distance_ban <= 500 THEN '100-500 km'
                            ELSE '> 500 km'
                        END as distance_range,
                        CASE
                            WHEN locprop_distance_ban = 0 THEN 1
                            WHEN locprop_distance_ban <= 1 THEN 2
                            WHEN locprop_distance_ban <= 5 THEN 3
                            WHEN locprop_distance_ban <= 10 THEN 4
                            WHEN locprop_distance_ban <= 50 THEN 5
                            WHEN locprop_distance_ban <= 100 THEN 6
                            WHEN locprop_distance_ban <= 500 THEN 7
                            ELSE 8
                        END as order_num
                    FROM owners_housing
                    WHERE locprop_distance_ban IS NOT NULL
                )
                SELECT
                    distance_range,
                    COUNT(*) as count,
                    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 2) as percentage
                FROM distance_ranges
                GROUP BY distance_range, order_num
                ORDER BY order_num
            """)
            return self.cursor.fetchall()
        except Exception as e:
            logging.error(f"Error getting distance ranges: {e}")
            return []

    def get_data_quality_issues(self) -> Dict:
        """Identify data quality issues."""
        try:
            # Records without owner coordinates
            self.cursor.execute("""
                SELECT COUNT(DISTINCT (oh.owner_id, oh.housing_id)) as count
                FROM owners_housing oh
                LEFT JOIN ban_addresses ba_owner ON ba_owner.ref_id = oh.owner_id
                    AND ba_owner.address_kind = 'Owner'
                WHERE ba_owner.ref_id IS NULL
                    OR ba_owner.latitude IS NULL
                    OR ba_owner.longitude IS NULL
            """)
            missing_owner_coords = self.cursor.fetchone()['count']

            # Records without housing coordinates
            self.cursor.execute("""
                SELECT COUNT(DISTINCT (oh.owner_id, oh.housing_id)) as count
                FROM owners_housing oh
                LEFT JOIN ban_addresses ba_housing ON ba_housing.ref_id = oh.housing_id
                    AND ba_housing.address_kind = 'Housing'
                WHERE ba_housing.ref_id IS NULL
                    OR ba_housing.latitude IS NULL
                    OR ba_housing.longitude IS NULL
            """)
            missing_housing_coords = self.cursor.fetchone()['count']

            # Records without owner postal codes
            self.cursor.execute("""
                SELECT COUNT(DISTINCT (oh.owner_id, oh.housing_id)) as count
                FROM owners_housing oh
                LEFT JOIN ban_addresses ba_owner ON ba_owner.ref_id = oh.owner_id
                    AND ba_owner.address_kind = 'Owner'
                WHERE ba_owner.ref_id IS NULL
                    OR ba_owner.postal_code IS NULL
            """)
            missing_owner_postal = self.cursor.fetchone()['count']

            # Records without housing postal codes
            self.cursor.execute("""
                SELECT COUNT(DISTINCT (oh.owner_id, oh.housing_id)) as count
                FROM owners_housing oh
                LEFT JOIN ban_addresses ba_housing ON ba_housing.ref_id = oh.housing_id
                    AND ba_housing.address_kind = 'Housing'
                WHERE ba_housing.ref_id IS NULL
                    OR ba_housing.postal_code IS NULL
            """)
            missing_housing_postal = self.cursor.fetchone()['count']

            return {
                'missing_owner_coords': missing_owner_coords,
                'missing_housing_coords': missing_housing_coords,
                'missing_owner_postal': missing_owner_postal,
                'missing_housing_postal': missing_housing_postal
            }
        except Exception as e:
            logging.error(f"Error getting data quality issues: {e}")
            return {}

    def generate_report(self):
        """Generate and display comprehensive statistics report."""
        print("\n" + "="*80)
        print("OWNER-HOUSING DISTANCE & CLASSIFICATION STATISTICS REPORT")
        print("="*80)
        print(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        # Total records
        total_records = self.get_total_records()
        print(f"📊 TOTAL RECORDS: {total_records:,}")
        print()

        # Distance coverage
        print("🎯 DISTANCE CALCULATION COVERAGE")
        print("-" * 40)
        distance_coverage = self.get_distance_coverage()
        if distance_coverage['available'] > 0:
            coverage_rate = (distance_coverage['calculated'] / distance_coverage['available']) * 100
        else:
            coverage_rate = 0

        print(f"Records with coordinates available: {distance_coverage['available']:,}")
        print(f"Distances calculated: {distance_coverage['calculated']:,}")
        print(f"Coverage rate: {coverage_rate:.1f}%")

        if total_records > 0:
            total_coverage = (distance_coverage['calculated'] / total_records) * 100
            print(f"Total dataset coverage: {total_coverage:.1f}%")
        print()

        # Classification coverage
        print("🏷️  CLASSIFICATION COVERAGE")
        print("-" * 40)
        classification_coverage = self.get_classification_coverage()
        if classification_coverage['available'] > 0:
            class_coverage_rate = (classification_coverage['calculated'] / classification_coverage['available']) * 100
        else:
            class_coverage_rate = 0

        print(f"Records with postal codes available: {classification_coverage['available']:,}")
        print(f"Classifications calculated: {classification_coverage['calculated']:,}")
        print(f"Coverage rate: {class_coverage_rate:.1f}%")

        if total_records > 0:
            class_total_coverage = (classification_coverage['calculated'] / total_records) * 100
            print(f"Total dataset coverage: {class_total_coverage:.1f}%")
        print()

        # Classification distribution
        print("📈 CLASSIFICATION DISTRIBUTION")
        print("-" * 40)
        classification_labels = {
            1: "Même code postal (citycode)",
            2: "Même département",
            3: "Même région",
            4: "Propriétaire en métropole, régions différentes",
            5: "Propriétaire en outre-mer, régions différentes",
            6: "Pays étranger détecté (propriétaire ou logement à l'étranger)",
            7: "Autres cas France ou données manquantes"
        }

        distributions = self.get_classification_distribution()
        for dist in distributions:
            classification = dist['classification']
            count = dist['count']
            percentage = dist['percentage']
            label = classification_labels.get(classification, f"Classification {classification}")
            print(f"  {classification}: {label}")
            print(f"      Count: {count:,} ({percentage}%)")
        print()

        # Distance statistics
        print("📏 DISTANCE STATISTICS")
        print("-" * 40)
        distance_stats = self.get_distance_statistics()
        if distance_stats:
            print(f"Count: {distance_stats['count']:,}")
            print(f"Min distance: {distance_stats['min_distance']} km")
            print(f"Max distance: {distance_stats['max_distance']} km")
            print(f"Average distance: {distance_stats['avg_distance']} km")
            print(f"Median distance: {distance_stats['median_distance']} km")
            print(f"Standard deviation: {distance_stats['std_distance']} km")
        print()

        # Distance ranges
        print("📊 DISTANCE RANGES DISTRIBUTION")
        print("-" * 40)
        distance_ranges = self.get_distance_ranges()
        for range_data in distance_ranges:
            range_name = range_data['distance_range']
            count = range_data['count']
            percentage = range_data['percentage']
            print(f"  {range_name}: {count:,} ({percentage}%)")
        print()

        # Data quality issues
        print("⚠️  DATA QUALITY ANALYSIS")
        print("-" * 40)
        quality_issues = self.get_data_quality_issues()
        if quality_issues:
            print(f"Records missing owner coordinates: {quality_issues['missing_owner_coords']:,}")
            print(f"Records missing housing coordinates: {quality_issues['missing_housing_coords']:,}")
            print(f"Records missing owner postal codes: {quality_issues['missing_owner_postal']:,}")
            print(f"Records missing housing postal codes: {quality_issues['missing_housing_postal']:,}")

            total_data_issues = max(
                quality_issues['missing_owner_coords'] + quality_issues['missing_housing_coords'],
                quality_issues['missing_owner_postal'] + quality_issues['missing_housing_postal']
            )
            if total_records > 0:
                data_quality_rate = ((total_records - total_data_issues) / total_records) * 100
                print(f"Overall data quality rate: {data_quality_rate:.1f}%")
        print()

        print("="*80)


def setup_logging():
    """Setup logging configuration."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    # Ensure logs directory exists
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    log_file = os.path.join(logs_dir, f'statistics_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')

    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Generate statistics report for owner-housing distances and classifications"
    )
    parser.add_argument(
        '--db-url',
        default='postgres://postgres:postgres@localhost:5433/copieprod',
        help='Database connection URL'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging()

    logging.info("Starting statistics report generation")
    logging.info(f"Database URL: {args.db_url}")

    # Initialize reporter
    reporter = StatisticsReporter(args.db_url)

    try:
        # Connect to database
        reporter.connect()

        # Generate report
        reporter.generate_report()

    except KeyboardInterrupt:
        logging.info("Report generation interrupted by user")
    except Exception as e:
        logging.error(f"Report generation failed with error: {e}")
        sys.exit(1)
    finally:
        reporter.disconnect()

    logging.info("Statistics report completed successfully")


if __name__ == "__main__":
    main()