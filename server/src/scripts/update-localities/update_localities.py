#!/usr/bin/env python3
"""
Update localities table with commune code changes (fusions and scissions).

This script reads an INSEE Excel file containing commune code mappings between years
(fusions and scissions) and updates the localities table accordingly.

EXCEL FILE FORMAT (INSEE table_passage_annuelle):
The Excel file should contain sheets:
- "Liste des fusions": Fusions - multiple old codes merge into one new code
  Columns: ANNEE_MODIF, COM_INI (old), COM_FIN (new), LIB_COM_INI, LIB_COM_FIN
- "Liste des scissions": Scissions - one old code splits into multiple new codes
  Columns: ANNEE_MODIF, COM_INI (old), COM_FIN (new), LIB_COM_INI, LIB_COM_FIN

Headers are at row 6 (0-indexed row 5), data starts at row 7.

OPERATIONS:
- Fusion: Update geo_code from old value to new value, delete duplicates
- Scission: Insert new localities for split codes, update original

Usage:
    # Dry-run mode (validation only)
    python update_localities.py --excel table_passage_annuelle_2025.xlsx --db-url postgresql://user:pass@host:port/db --dry-run

    # Execute update
    python update_localities.py --excel table_passage_annuelle_2025.xlsx --db-url postgresql://user:pass@host:port/db

    # With specific target year
    python update_localities.py --excel table_passage_annuelle_2025.xlsx --db-url postgresql://user:pass@host:port/db --target-year 2025
"""

import argparse
import csv
import logging
import sys
from typing import Dict, List, Set

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from tqdm import tqdm

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas is required. Install with: pip install pandas openpyxl")
    sys.exit(1)


class LocalitiesUpdater:
    """Update localities table with commune code changes."""

    def __init__(
        self,
        db_url: str,
        excel_path: str,
        target_year: int = 2025,
        dry_run: bool = False,
        batch_size: int = 1000,
        output_csv: str = None,
    ):
        """
        Initialize the updater.

        Args:
            db_url: PostgreSQL connection URI
            excel_path: Path to the Excel mapping file
            target_year: Target year for the new codes (default: 2025)
            dry_run: If True, validate without writing to DB
            batch_size: Number of records per batch
            output_csv: Path to output CSV file for changes report
        """
        self.db_url = db_url
        self.excel_path = excel_path
        self.target_year = target_year
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.output_csv = output_csv
        self.conn = None
        self.cursor = None

        # Statistics
        self.stats = {
            "fusions_processed": 0,
            "fusions_updated": 0,
            "fusions_deleted": 0,
            "scissions_processed": 0,
            "scissions_inserted": 0,
            "scissions_updated": 0,
            "not_found": 0,
            "errors": 0,
        }

        # Track changes for reporting
        self.changes: List[Dict] = []
        self.not_found_codes: Set[str] = set()

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            logging.info("Database connection established")
        except Exception as e:
            logging.error(f"Database connection failed: {e}")
            raise

    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def load_existing_localities(self) -> Dict[str, Dict]:
        """
        Load all existing localities from the database.

        Returns:
            Dictionary mapping geo_code to locality record
        """
        self.cursor.execute("SELECT * FROM localities")
        localities = {row["geo_code"]: dict(row) for row in self.cursor.fetchall()}
        print(f"  Loaded {len(localities):,} existing localities from database")
        return localities

    def _normalize_geo_code(self, value) -> str | None:
        """
        Normalize a geo_code to 5 characters with leading zeros.

        Handles:
        - Numeric values (1330 → "01330")
        - Float values from Excel (1330.0 → "01330")
        - String values already padded ("01330" → "01330")
        - Corsican codes ("2A004" → "2A004")
        """
        if pd.isna(value):
            return None

        # Handle numeric types (int, float)
        if isinstance(value, (int, float)):
            return str(int(value)).zfill(5)

        code = str(value).strip()

        # Handle string floats like "1330.0"
        if "." in code:
            try:
                return str(int(float(code))).zfill(5)
            except ValueError:
                pass

        # If it's purely numeric, pad with zeros
        if code.isdigit():
            return code.zfill(5)

        # Otherwise (e.g., Corsican codes 2A/2B), return as-is
        return code

    def load_excel_mappings(self) -> tuple[List[Dict], List[Dict]]:
        """
        Load fusion and scission mappings from Excel file.

        Returns:
            Tuple of (fusion_mappings, scission_mappings)
        """
        print(f"\n📂 Loading Excel file: {self.excel_path}")

        fusion_mappings = []
        scission_mappings = []

        # Read fusions sheet
        try:
            df_fusions = pd.read_excel(
                self.excel_path,
                sheet_name="Liste des fusions",
                header=5,  # Headers at row 6 (0-indexed 5)
            )
            print(f"  Fusions sheet: {len(df_fusions):,} rows total")

            # Filter by target year
            df_fusions_year = df_fusions[df_fusions["ANNEE_MODIF"] == self.target_year]
            print(f"  Fusions for year {self.target_year}: {len(df_fusions_year):,} rows")

            # Build fusion mappings
            # Fusions: multiple COM_INI → one COM_FIN (those with same COM_FIN)
            for _, row in df_fusions_year.iterrows():
                com_ini = self._normalize_geo_code(row["COM_INI"])
                com_fin = self._normalize_geo_code(row["COM_FIN"])
                lib_ini = str(row["LIB_COM_INI"]).strip() if pd.notna(row.get("LIB_COM_INI")) else ""
                lib_fin = str(row["LIB_COM_FIN"]).strip() if pd.notna(row.get("LIB_COM_FIN")) else ""

                if com_ini and com_fin and com_ini != com_fin:
                    fusion_mappings.append({
                        "old_code": com_ini,
                        "new_code": com_fin,
                        "old_name": lib_ini,
                        "new_name": lib_fin,
                    })

            print(f"  Loaded {len(fusion_mappings):,} fusion mappings (code changes)")

        except Exception as e:
            logging.warning(f"Could not read fusions sheet: {e}")

        # Read scissions sheet
        try:
            df_scissions = pd.read_excel(
                self.excel_path,
                sheet_name="Liste des scissions",
                header=5,  # Headers at row 6 (0-indexed 5)
            )
            print(f"  Scissions sheet: {len(df_scissions):,} rows total")

            # Filter by target year
            df_scissions_year = df_scissions[df_scissions["ANNEE_MODIF"] == self.target_year]
            print(f"  Scissions for year {self.target_year}: {len(df_scissions_year):,} rows")

            # Group by COM_INI to find scissions (one code → multiple codes)
            scissions_by_source: Dict[str, List[Dict]] = {}

            for _, row in df_scissions_year.iterrows():
                com_ini = self._normalize_geo_code(row["COM_INI"])
                com_fin = self._normalize_geo_code(row["COM_FIN"])
                lib_fin = str(row["LIB_COM_FIN"]).strip() if pd.notna(row.get("LIB_COM_FIN")) else ""

                if com_ini and com_fin:
                    if com_ini not in scissions_by_source:
                        scissions_by_source[com_ini] = []
                    scissions_by_source[com_ini].append({
                        "code": com_fin,
                        "name": lib_fin,
                    })

            # Build scission mappings
            for source_code, targets in scissions_by_source.items():
                if len(targets) >= 1:  # Include even single-target updates
                    scission_mappings.append({
                        "source_code": source_code,
                        "targets": targets,
                    })

            print(f"  Loaded {len(scission_mappings):,} scission mappings")

        except Exception as e:
            logging.warning(f"Could not read scissions sheet: {e}")

        return fusion_mappings, scission_mappings

    def process_fusions(self, fusion_mappings: List[Dict], localities: Dict[str, Dict]):
        """
        Process fusion mappings: update geo_code and delete duplicates.

        For fusions, old codes become new codes.
        If the new code already exists, we delete the old locality.
        Otherwise, we update the old locality to use the new code.

        Args:
            fusion_mappings: List of fusion mapping dictionaries
            localities: Dictionary of existing localities
        """
        print(f"\n🔄 Processing {len(fusion_mappings):,} fusions...")

        updates = []
        deletes = []

        for mapping in tqdm(fusion_mappings, desc="Analyzing fusions"):
            self.stats["fusions_processed"] += 1
            old_code = mapping["old_code"]
            new_code = mapping["new_code"]

            if old_code in localities:
                # Check if new code already exists
                if new_code in localities:
                    # New code exists - delete the old locality
                    deletes.append(old_code)
                    self.changes.append({
                        "type": "fusion_delete",
                        "old_code": old_code,
                        "new_code": new_code,
                        "old_name": mapping.get("old_name", ""),
                        "new_name": mapping.get("new_name", ""),
                        "reason": "merged into existing locality",
                    })
                else:
                    # New code doesn't exist - update old locality to new code
                    updates.append({
                        "old_code": old_code,
                        "new_code": new_code,
                        "new_name": mapping.get("new_name", ""),
                    })
                    # Track to prevent future updates to same target
                    localities[new_code] = localities[old_code].copy()
                    localities[new_code]["geo_code"] = new_code
                    self.changes.append({
                        "type": "fusion_update",
                        "old_code": old_code,
                        "new_code": new_code,
                        "new_name": mapping.get("new_name", ""),
                    })
            else:
                self.not_found_codes.add(old_code)

        # Execute updates
        if updates and not self.dry_run:
            print(f"\n  Updating {len(updates):,} localities...")
            for batch_start in range(0, len(updates), self.batch_size):
                batch = updates[batch_start:batch_start + self.batch_size]
                update_data = [(u["new_code"], u["new_name"], u["old_code"]) for u in batch]

                execute_values(
                    self.cursor,
                    """
                    UPDATE localities AS l
                    SET geo_code = data.new_code,
                        name = COALESCE(NULLIF(data.new_name, ''), l.name)
                    FROM (VALUES %s) AS data(new_code, new_name, old_code)
                    WHERE l.geo_code = data.old_code
                    """,
                    update_data,
                    page_size=500,
                )

            self.conn.commit()

        self.stats["fusions_updated"] = len(updates)

        # Execute deletes
        if deletes and not self.dry_run:
            print(f"  Deleting {len(deletes):,} merged localities...")
            for batch_start in range(0, len(deletes), self.batch_size):
                batch = deletes[batch_start:batch_start + self.batch_size]

                self.cursor.execute(
                    "DELETE FROM localities WHERE geo_code = ANY(%s)",
                    (batch,)
                )

            self.conn.commit()

        self.stats["fusions_deleted"] = len(deletes)

    def process_scissions(self, scission_mappings: List[Dict], localities: Dict[str, Dict]):
        """
        Process scission mappings: insert new localities for split codes.

        For scissions, one old code becomes multiple new codes.
        We update the original and insert new localities.

        Args:
            scission_mappings: List of scission mapping dictionaries
            localities: Dictionary of existing localities
        """
        print(f"\n🔀 Processing {len(scission_mappings):,} scissions...")

        updates = []
        inserts = []

        for mapping in tqdm(scission_mappings, desc="Analyzing scissions"):
            self.stats["scissions_processed"] += 1
            source_code = mapping["source_code"]
            targets = mapping["targets"]

            if source_code not in localities:
                self.not_found_codes.add(source_code)
                continue

            source_locality = localities[source_code]

            # First target: update the original locality
            first_target = targets[0]
            if source_code != first_target["code"]:
                updates.append({
                    "old_code": source_code,
                    "new_code": first_target["code"],
                    "new_name": first_target.get("name", ""),
                })
                self.changes.append({
                    "type": "scission_update",
                    "old_code": source_code,
                    "new_code": first_target["code"],
                    "new_name": first_target.get("name", ""),
                })

            # Other targets: insert new localities
            for target in targets[1:]:
                target_code = target["code"]
                if target_code not in localities:
                    # Copy locality data with new geo_code
                    new_locality = {
                        "geo_code": target_code,
                        "name": target.get("name", "") or source_locality.get("name", ""),
                    }
                    inserts.append(new_locality)
                    localities[target_code] = new_locality  # Track to avoid duplicates
                    self.changes.append({
                        "type": "scission_insert",
                        "source_code": source_code,
                        "new_code": target_code,
                        "new_name": target.get("name", ""),
                    })

        # Execute updates
        if updates and not self.dry_run:
            print(f"\n  Updating {len(updates):,} localities...")
            for batch_start in range(0, len(updates), self.batch_size):
                batch = updates[batch_start:batch_start + self.batch_size]
                update_data = [(u["new_code"], u["new_name"], u["old_code"]) for u in batch]

                execute_values(
                    self.cursor,
                    """
                    UPDATE localities AS l
                    SET geo_code = data.new_code,
                        name = COALESCE(NULLIF(data.new_name, ''), l.name)
                    FROM (VALUES %s) AS data(new_code, new_name, old_code)
                    WHERE l.geo_code = data.old_code
                    """,
                    update_data,
                    page_size=500,
                )

            self.conn.commit()

        self.stats["scissions_updated"] = len(updates)

        # Execute inserts
        if inserts and not self.dry_run:
            print(f"  Inserting {len(inserts):,} new localities...")
            for batch_start in range(0, len(inserts), self.batch_size):
                batch = inserts[batch_start:batch_start + self.batch_size]
                insert_data = [
                    (loc["geo_code"], loc["name"])
                    for loc in batch
                ]

                execute_values(
                    self.cursor,
                    """
                    INSERT INTO localities (geo_code, name)
                    VALUES %s
                    ON CONFLICT (geo_code) DO NOTHING
                    """,
                    insert_data,
                    page_size=500,
                )

            self.conn.commit()

        self.stats["scissions_inserted"] = len(inserts)

    def export_csv(self):
        """Export all changes and not-found codes to a CSV file."""
        print(f"\n📄 Exporting changes to: {self.output_csv}")

        with open(self.output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter=";")

            # Header
            writer.writerow([
                "type",
                "action",
                "old_code",
                "new_code",
                "old_name",
                "new_name",
                "reason",
            ])

            # Write changes
            for change in self.changes:
                change_type = change["type"]

                if change_type == "fusion_update":
                    writer.writerow([
                        "fusion",
                        "update",
                        change.get("old_code", ""),
                        change.get("new_code", ""),
                        change.get("old_name", ""),
                        change.get("new_name", ""),
                        "",
                    ])
                elif change_type == "fusion_delete":
                    writer.writerow([
                        "fusion",
                        "delete",
                        change.get("old_code", ""),
                        change.get("new_code", ""),
                        change.get("old_name", ""),
                        change.get("new_name", ""),
                        change.get("reason", "merged into existing locality"),
                    ])
                elif change_type == "scission_update":
                    writer.writerow([
                        "scission",
                        "update",
                        change.get("old_code", ""),
                        change.get("new_code", ""),
                        "",
                        change.get("new_name", ""),
                        "",
                    ])
                elif change_type == "scission_insert":
                    writer.writerow([
                        "scission",
                        "insert",
                        change.get("source_code", ""),
                        change.get("new_code", ""),
                        "",
                        change.get("new_name", ""),
                        "new locality created",
                    ])

            # Write not found codes
            for code in sorted(self.not_found_codes):
                writer.writerow([
                    "not_found",
                    "skip",
                    code,
                    "",
                    "",
                    "",
                    "code not found in database",
                ])

        print(f"  Exported {len(self.changes)} changes + {len(self.not_found_codes)} not-found codes")

    def run(self):
        """Main execution method."""
        print("=" * 80)
        print("LOCALITIES UPDATER")
        print("=" * 80)
        print(f"Excel file: {self.excel_path}")
        print(f"Target year: {self.target_year}")
        print(f"Dry-run: {self.dry_run}")
        print()

        self.connect()

        try:
            # Load existing localities
            print("📋 Loading existing localities...")
            localities = self.load_existing_localities()

            # Load Excel mappings
            fusion_mappings, scission_mappings = self.load_excel_mappings()

            if not fusion_mappings and not scission_mappings:
                print("\n⚠️  No mappings found in Excel file for year", self.target_year)
                return

            # Process fusions first
            if fusion_mappings:
                self.process_fusions(fusion_mappings, localities)

            # Then process scissions
            if scission_mappings:
                self.process_scissions(scission_mappings, localities)

            # Print summary
            print("\n" + "=" * 80)
            print("SUMMARY")
            print("=" * 80)
            print(f"Fusions processed: {self.stats['fusions_processed']:,}")
            print(f"  - Updated: {self.stats['fusions_updated']:,}")
            print(f"  - Deleted (duplicates): {self.stats['fusions_deleted']:,}")
            print(f"Scissions processed: {self.stats['scissions_processed']:,}")
            print(f"  - Updated: {self.stats['scissions_updated']:,}")
            print(f"  - Inserted: {self.stats['scissions_inserted']:,}")
            print(f"Not found in DB: {len(self.not_found_codes):,}")

            if self.dry_run:
                print("\n[DRY-RUN] No changes were made to the database")

            # Report not found codes
            if self.not_found_codes:
                print(f"\n--- Codes not found in database (first 20) ---")
                for code in sorted(self.not_found_codes)[:20]:
                    print(f"  {code}")
                if len(self.not_found_codes) > 20:
                    print(f"  ... and {len(self.not_found_codes) - 20} more")

            # Report changes
            if self.changes and len(self.changes) <= 50:
                print(f"\n--- Changes {'to be made' if self.dry_run else 'made'} ---")
                for change in self.changes:
                    if change["type"] == "fusion_update":
                        print(f"  FUSION: {change['old_code']} → {change['new_code']} ({change.get('new_name', '')})")
                    elif change["type"] == "fusion_delete":
                        print(f"  FUSION DELETE: {change['old_code']} (merged into {change['new_code']})")
                    elif change["type"] == "scission_update":
                        print(f"  SCISSION: {change['old_code']} → {change['new_code']} ({change.get('new_name', '')})")
                    elif change["type"] == "scission_insert":
                        print(f"  SCISSION INSERT: {change['source_code']} → {change['new_code']} ({change.get('new_name', '')}) [new]")
            elif self.changes:
                print(f"\n--- {len(self.changes)} changes {'to be made' if self.dry_run else 'made'} (too many to display) ---")

            # Export to CSV if requested
            if self.output_csv:
                self.export_csv()

        except Exception as e:
            logging.error(f"Update failed: {e}")
            if self.conn:
                self.conn.rollback()
            raise

        finally:
            self.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description="Update localities table with commune code changes (fusions/scissions)"
    )

    # Required arguments
    parser.add_argument(
        "--excel",
        required=True,
        help="Path to the Excel file with fusion/scission mappings (INSEE format)",
    )
    parser.add_argument(
        "--db-url",
        required=True,
        help="PostgreSQL connection URI (postgresql://user:pass@host:port/dbname)",
    )

    # Optional arguments
    parser.add_argument(
        "--target-year",
        type=int,
        default=2025,
        help="Target year for the new codes (default: 2025)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate without writing to database",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Batch size for database operations (default: 1000)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--output-csv",
        help="Path to output CSV file for detailed changes report",
    )

    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.WARNING,
        format="%(levelname)s - %(message)s",
    )

    # Create and run updater
    updater = LocalitiesUpdater(
        db_url=args.db_url,
        excel_path=args.excel,
        target_year=args.target_year,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        output_csv=args.output_csv,
    )

    try:
        updater.run()
        print("\n" + ("=" * 80))
        if args.dry_run:
            print("DRY-RUN completed successfully")
        else:
            print("Update completed successfully")
        print("=" * 80)
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nFailed: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
