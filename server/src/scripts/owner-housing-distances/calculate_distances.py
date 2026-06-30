#!/usr/bin/env python3
"""
Calculate relative owner-housing locations for a scoped LOVAC cohort.

The command is intentionally scoped by `--data-file-year`. It should not be
used as an unbounded production backfill.
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import os
import sys
from collections import Counter
from dataclasses import asdict, dataclass, field
from math import asin, cos, radians, sin, sqrt
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from tqdm import tqdm

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from country_detector import CountryDetector


SAME_ADDRESS_THRESHOLD_KM = 0.05
ACTIVE_OWNER_MIN_RANK = 1
ZERO_KEY = (None, None, None)


@dataclass(frozen=True)
class LocationScope:
    data_file_year: str
    establishment_id: str | None = None
    geo_codes: tuple[str, ...] = ()


@dataclass
class LocationComputationReport:
    scope: dict
    dry_run: bool
    force: bool
    limit: int | None
    candidate_count: int
    processed_pairs: int = 0
    updates_prepared: int = 0
    updated_pairs: int = 0
    errors: int = 0
    classification_counts: dict[str, int] = field(default_factory=dict)
    stats: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


class DistanceCalculator:
    """
    Calculate distances and relative locations for owner-housing pairs.

    Classification values are aligned with the application model:
    0 same address, 1 same commune, 2 same department, 3 same region,
    4 owner in metropolitan France but another region, 5 owner overseas,
    6 owner abroad, 7 missing/other.
    """

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.conn = None
        self.cursor = None
        self.metro_regions = None
        self.overseas_regions = None
        self.country_detector = CountryDetector(model_name="rule-based", use_llm=False)
        self.country_cache: dict[str, str] = {}
        self.stats = self._empty_stats()

    @staticmethod
    def _empty_stats() -> dict[str, int]:
        return {
            "processed_pairs": 0,
            "addresses_with_coords": 0,
            "addresses_without_coords": 0,
            "distances_calculated": 0,
            "geographic_rules_applied": 0,
            "france_detected": 0,
            "foreign_detected": 0,
            "unknown_detected": 0,
            "errors": 0,
            "missing_owner_data": 0,
            "missing_housing_data": 0,
            "missing_both_data": 0,
            "pairs_with_both_coords": 0,
            "pairs_with_owner_coords_only": 0,
            "pairs_with_housing_coords_only": 0,
            "pairs_with_no_coords": 0,
        }

    def connect(self) -> None:
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        except Exception as error:
            print(f"Database connection failed: {error}")
            raise

    def disconnect(self) -> None:
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def detect_country_simple(self, address: str | None) -> str:
        """Detect whether an address is French, foreign, or unknown."""
        if not address or not str(address).strip():
            return "UNKNOWN"
        normalized = str(address).strip()
        if normalized.lower() in ["nan", "null", "none"]:
            return "UNKNOWN"
        if normalized in self.country_cache:
            return self.country_cache[normalized]

        try:
            result = self.country_detector.detect_country(normalized)
        except Exception as error:
            logging.debug("Country detection error for '%s': %s", normalized, error)
            result = "UNKNOWN"
        if result not in {"FRANCE", "FOREIGN", "UNKNOWN"}:
            result = "UNKNOWN"

        self.country_cache[normalized] = result
        return result

    def _scope_sql(self, scope: LocationScope) -> tuple[list[str], dict]:
        clauses = ["%(data_file_year)s = ANY(h.data_file_years)"]
        params: dict = {"data_file_year": scope.data_file_year}

        if scope.establishment_id:
            clauses.append(
                """
                h.geo_code = ANY(
                  COALESCE(
                    (
                      SELECT localities_geo_code
                      FROM establishments
                      WHERE id = %(establishment_id)s::uuid
                    ),
                    ARRAY[]::text[]
                  )
                )
                """
            )
            params["establishment_id"] = scope.establishment_id

        if scope.geo_codes:
            clauses.append("h.geo_code = ANY(%(geo_codes)s::text[])")
            params["geo_codes"] = list(scope.geo_codes)

        return clauses, params

    def count_owner_housing_pairs(self, scope: LocationScope, force: bool = False) -> int:
        clauses, params = self._scope_sql(scope)
        if not force:
            clauses.append("oh.locprop_relative_ban IS NULL")

        where_sql = "\nAND ".join(clauses)
        query = f"""
            SELECT COUNT(*) AS count
            FROM owners_housing oh
            JOIN fast_housing h
              ON h.id = oh.housing_id
             AND h.geo_code = oh.housing_geo_code
            WHERE oh.rank >= {ACTIVE_OWNER_MIN_RANK}
              AND {where_sql}
        """
        self.cursor.execute(query, params)
        return int(self.cursor.fetchone()["count"])

    def fetch_owner_housing_pair_batch(
        self,
        scope: LocationScope,
        last_key: tuple[str | None, str | None, str | None] = ZERO_KEY,
        batch_size: int = 50_000,
        force: bool = False,
    ) -> list[dict]:
        clauses, params = self._scope_sql(scope)
        if not force:
            clauses.append("oh.locprop_relative_ban IS NULL")
        if last_key != ZERO_KEY:
            clauses.append(
                """
                (oh.owner_id::text, oh.housing_id::text, oh.housing_geo_code)
                > (%(last_owner_id)s, %(last_housing_id)s, %(last_housing_geo_code)s)
                """
            )
            params.update(
                {
                    "last_owner_id": last_key[0],
                    "last_housing_id": last_key[1],
                    "last_housing_geo_code": last_key[2],
                }
            )
        params["batch_size"] = batch_size

        where_sql = "\nAND ".join(clauses)
        query = f"""
            SELECT
              oh.owner_id::text AS owner_id,
              oh.housing_id::text AS housing_id,
              oh.housing_geo_code,
              oh.locprop_distance_ban,
              oh.locprop_relative_ban
            FROM owners_housing oh
            JOIN fast_housing h
              ON h.id = oh.housing_id
             AND h.geo_code = oh.housing_geo_code
            WHERE oh.rank >= {ACTIVE_OWNER_MIN_RANK}
              AND {where_sql}
            ORDER BY oh.owner_id, oh.housing_id, oh.housing_geo_code
            LIMIT %(batch_size)s
        """
        self.cursor.execute(query, params)
        return list(self.cursor.fetchall())

    def get_address_data(
        self, ref_id: str, address_kind: str
    ) -> Optional[tuple[str, str, float, float, str, str]]:
        try:
            if address_kind == "Owner":
                self.cursor.execute(
                    """
                    SELECT
                      ba.postal_code,
                      ba.address,
                      ba.latitude,
                      ba.longitude,
                      LEFT(ba.postal_code, 5) AS geo_code,
                      ba.ban_id
                    FROM ban_addresses ba
                    WHERE ba.ref_id = %s AND ba.address_kind = %s
                    """,
                    (ref_id, address_kind),
                )
            else:
                self.cursor.execute(
                    """
                    SELECT
                      ba.postal_code,
                      ba.address,
                      ba.latitude,
                      ba.longitude,
                      h.geo_code,
                      ba.ban_id
                    FROM ban_addresses ba
                    LEFT JOIN fast_housing h ON h.id = ba.ref_id
                    WHERE ba.ref_id = %s AND ba.address_kind = %s
                    """,
                    (ref_id, address_kind),
                )

            result = self.cursor.fetchone()
            if result:
                return (
                    result["postal_code"],
                    result["address"],
                    result["latitude"],
                    result["longitude"],
                    result["geo_code"],
                    result["ban_id"],
                )
            return None
        except Exception as error:
            logging.debug("Error getting address data for %s: %s", ref_id, error)
            return None

    def batch_get_address_data(self, pairs: list[dict]) -> dict:
        try:
            owner_ids = sorted({pair["owner_id"] for pair in pairs})
            housing_ids = sorted({pair["housing_id"] for pair in pairs})
            address_cache = {}

            if owner_ids:
                self.cursor.execute(
                    """
                    SELECT
                      ba.ref_id::text,
                      ba.postal_code,
                      ba.address,
                      ba.latitude,
                      ba.longitude,
                      LEFT(ba.postal_code, 5) AS geo_code,
                      ba.ban_id
                    FROM ban_addresses ba
                    WHERE ba.ref_id::text = ANY(%s) AND ba.address_kind = 'Owner'
                    """,
                    (owner_ids,),
                )
                for row in self.cursor.fetchall():
                    address_cache[(row["ref_id"], "Owner")] = (
                        row["postal_code"],
                        row["address"],
                        row["latitude"],
                        row["longitude"],
                        row["geo_code"],
                        row["ban_id"],
                    )

            if housing_ids:
                self.cursor.execute(
                    """
                    SELECT
                      ba.ref_id::text,
                      ba.postal_code,
                      ba.address,
                      ba.latitude,
                      ba.longitude,
                      h.geo_code,
                      ba.ban_id
                    FROM ban_addresses ba
                    LEFT JOIN fast_housing h ON h.id = ba.ref_id
                    WHERE ba.ref_id::text = ANY(%s) AND ba.address_kind = 'Housing'
                    """,
                    (housing_ids,),
                )
                for row in self.cursor.fetchall():
                    address_cache[(row["ref_id"], "Housing")] = (
                        row["postal_code"],
                        row["address"],
                        row["latitude"],
                        row["longitude"],
                        row["geo_code"],
                        row["ban_id"],
                    )

            return address_cache
        except Exception as error:
            logging.error("Error in batch_get_address_data: %s", error)
            return {}

    @staticmethod
    def haversine_distance(
        lat1: float, lon1: float, lat2: float, lon2: float
    ) -> Optional[float]:
        if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90):
            logging.warning("Invalid latitude: lat1=%s, lat2=%s", lat1, lat2)
            return None
        if not (-180 <= lon1 <= 180 and -180 <= lon2 <= 180):
            logging.warning("Invalid longitude: lon1=%s, lon2=%s", lon1, lon2)
            return None

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return 6371 * c

    @staticmethod
    def _has_coordinates(address_data: tuple | None) -> bool:
        return bool(
            address_data
            and address_data[2] is not None
            and address_data[3] is not None
        )

    def _country_from_address_data(self, address_data: tuple | None) -> str:
        if not address_data:
            return "UNKNOWN"
        if self._has_coordinates(address_data):
            return "FRANCE"

        address = address_data[1]
        if not address or not str(address).strip():
            return "UNKNOWN"
        return self.detect_country_simple(address)

    def process_single_pair(
        self, owner_id: str, housing_id: str, address_cache: dict | None = None
    ) -> tuple[Optional[float], int]:
        if address_cache is not None:
            owner_data = address_cache.get((owner_id, "Owner"))
            housing_data = address_cache.get((housing_id, "Housing"))
        else:
            owner_data = self.get_address_data(owner_id, "Owner")
            housing_data = self.get_address_data(housing_id, "Housing")

        distance = None
        classification = 7

        if not owner_data and not housing_data:
            self.stats["missing_both_data"] += 1
            return distance, classification
        if not owner_data:
            self.stats["missing_owner_data"] += 1
            return distance, classification
        if not housing_data:
            self.stats["missing_housing_data"] += 1
            return distance, classification

        (
            owner_postal,
            owner_address,
            owner_lat,
            owner_lon,
            owner_geo_code,
            owner_ban_id,
        ) = owner_data
        (
            housing_postal,
            housing_address,
            housing_lat,
            housing_lon,
            housing_geo_code,
            housing_ban_id,
        ) = housing_data

        owner_has_coords = self._has_coordinates(owner_data)
        housing_has_coords = self._has_coordinates(housing_data)

        if owner_has_coords and housing_has_coords:
            self.stats["pairs_with_both_coords"] += 1
            distance = self.haversine_distance(
                owner_lat, owner_lon, housing_lat, housing_lon
            )
            self.stats["distances_calculated"] += 1
        elif owner_has_coords:
            self.stats["pairs_with_owner_coords_only"] += 1
        elif housing_has_coords:
            self.stats["pairs_with_housing_coords_only"] += 1
        else:
            self.stats["pairs_with_no_coords"] += 1

        owner_country = self._country_from_address_data(owner_data)
        housing_country = self._country_from_address_data(housing_data)
        if owner_has_coords:
            self.stats["addresses_with_coords"] += 1
        else:
            self.stats["addresses_without_coords"] += 1
        if housing_has_coords:
            self.stats["addresses_with_coords"] += 1
        else:
            self.stats["addresses_without_coords"] += 1

        if owner_country == "FOREIGN" or housing_country == "FOREIGN":
            self.stats["foreign_detected"] += 1
            return distance, 6
        if owner_country == "UNKNOWN" or housing_country == "UNKNOWN":
            self.stats["unknown_detected"] += 1
            return distance, 7
        self.stats["france_detected"] += 1

        if owner_ban_id and housing_ban_id and owner_ban_id == housing_ban_id:
            return distance, 0
        if distance is not None and distance < SAME_ADDRESS_THRESHOLD_KM:
            return distance, 0

        if owner_postal and housing_postal:
            classification = self.calculate_french_geographic_rules(
                owner_postal, housing_postal
            )
            self.stats["geographic_rules_applied"] += 1
        elif owner_geo_code and housing_geo_code:
            classification = self.calculate_french_geographic_rules_from_geocode(
                owner_geo_code, housing_geo_code
            )
            self.stats["geographic_rules_applied"] += 1

        return distance, classification

    def calculate_french_geographic_rules_from_geocode(
        self, owner_geo_code: str, housing_geo_code: str
    ) -> int:
        if owner_geo_code == housing_geo_code:
            return 1

        owner_dept = (
            owner_geo_code[:3] if owner_geo_code.startswith(("97", "98")) else owner_geo_code[:2]
        )
        housing_dept = (
            housing_geo_code[:3]
            if housing_geo_code.startswith(("97", "98"))
            else housing_geo_code[:2]
        )
        if owner_dept == housing_dept:
            return 2

        if self.same_region_from_dept(owner_dept, housing_dept):
            return 3
        if self.is_metro_region_from_dept(owner_dept):
            return 4
        if self.is_overseas_region_from_dept(owner_dept):
            return 5
        return 7

    def calculate_french_geographic_rules(
        self, owner_postal: str, housing_postal: str
    ) -> int:
        if owner_postal == housing_postal:
            return 1

        owner_dept = owner_postal[:3] if owner_postal.startswith(("97", "98")) else owner_postal[:2]
        housing_dept = (
            housing_postal[:3] if housing_postal.startswith(("97", "98")) else housing_postal[:2]
        )
        if owner_dept == housing_dept:
            return 2
        if self.same_region(owner_postal, housing_postal):
            return 3
        if self.is_metro_region(owner_postal):
            return 4
        if self.is_overseas_region(owner_postal):
            return 5
        return 7

    def load_regions(self) -> None:
        if self.metro_regions is not None and self.overseas_regions is not None:
            return
        self.metro_regions = [
            "11",
            "24",
            "27",
            "28",
            "32",
            "44",
            "52",
            "53",
            "75",
            "76",
            "84",
            "93",
            "94",
        ]
        self.overseas_regions = ["01", "02", "03", "04", "06"]

    def same_region(self, postal_code1: str, postal_code2: str) -> bool:
        self.load_regions()
        region1 = self.get_region_from_postal_code(postal_code1)
        region2 = self.get_region_from_postal_code(postal_code2)
        return region1 == region2 and region1 is not None

    def is_metro_region(self, postal_code: str) -> bool:
        self.load_regions()
        region = self.get_region_from_postal_code(postal_code)
        return region in self.metro_regions if region else False

    def is_overseas_region(self, postal_code: str) -> bool:
        self.load_regions()
        region = self.get_region_from_postal_code(postal_code)
        return region in self.overseas_regions if region else False

    def same_region_from_dept(self, dept1: str, dept2: str) -> bool:
        self.load_regions()
        region1 = self.get_region_from_dept(dept1)
        region2 = self.get_region_from_dept(dept2)
        return region1 == region2 and region1 is not None

    def is_metro_region_from_dept(self, dept: str) -> bool:
        self.load_regions()
        region = self.get_region_from_dept(dept)
        return region in self.metro_regions if region else False

    def is_overseas_region_from_dept(self, dept: str) -> bool:
        self.load_regions()
        region = self.get_region_from_dept(dept)
        return region in self.overseas_regions if region else False

    def get_region_from_dept(self, dept: str) -> Optional[str]:
        if not dept:
            return None

        dept_to_region = {
            "01": "84",
            "02": "32",
            "03": "84",
            "04": "93",
            "05": "93",
            "06": "93",
            "07": "84",
            "08": "44",
            "09": "76",
            "10": "44",
            "11": "76",
            "12": "76",
            "13": "93",
            "14": "28",
            "15": "84",
            "16": "75",
            "17": "75",
            "18": "24",
            "19": "75",
            "20": "94",
            "2A": "94",
            "2B": "94",
            "21": "27",
            "22": "53",
            "23": "75",
            "24": "75",
            "25": "27",
            "26": "84",
            "27": "28",
            "28": "24",
            "29": "53",
            "30": "76",
            "31": "76",
            "32": "76",
            "33": "75",
            "34": "76",
            "35": "53",
            "36": "24",
            "37": "24",
            "38": "84",
            "39": "27",
            "40": "75",
            "41": "24",
            "42": "84",
            "43": "84",
            "44": "52",
            "45": "24",
            "46": "76",
            "47": "75",
            "48": "76",
            "49": "52",
            "50": "28",
            "51": "44",
            "52": "44",
            "53": "52",
            "54": "44",
            "55": "44",
            "56": "53",
            "57": "44",
            "58": "27",
            "59": "32",
            "60": "32",
            "61": "28",
            "62": "32",
            "63": "84",
            "64": "75",
            "65": "76",
            "66": "76",
            "67": "44",
            "68": "44",
            "69": "84",
            "70": "27",
            "71": "27",
            "72": "52",
            "73": "84",
            "74": "84",
            "75": "11",
            "76": "28",
            "77": "11",
            "78": "11",
            "79": "75",
            "80": "32",
            "81": "76",
            "82": "76",
            "83": "93",
            "84": "93",
            "85": "52",
            "86": "75",
            "87": "75",
            "88": "44",
            "89": "27",
            "90": "27",
            "91": "11",
            "92": "11",
            "93": "11",
            "94": "11",
            "95": "11",
            "971": "01",
            "972": "02",
            "973": "03",
            "974": "04",
            "976": "06",
        }
        return dept_to_region.get(dept)

    def get_region_from_postal_code(self, postal_code: str) -> Optional[str]:
        if not postal_code or len(postal_code) < 2:
            return None
        if len(postal_code) >= 3:
            dept3 = postal_code[:3]
            region = self.get_region_from_dept(dept3)
            if region:
                return region
        return self.get_region_from_dept(postal_code[:2])

    def update_database(
        self, updates: list[dict], num_workers: int = 1, dry_run: bool = False
    ) -> int:
        if not updates:
            return 0
        if dry_run:
            print(f"Dry-run: skipped {len(updates):,} database updates")
            return 0

        print("\nUpdating database...")
        batch_size = 10_000
        batches = [
            (i // batch_size, updates[i : i + batch_size], self.db_url)
            for i in range(0, len(updates), batch_size)
        ]
        total_updates = 0
        total_errors = 0

        if num_workers <= 1:
            iterator = batches
            for batch in tqdm(iterator, desc="Saving to database", unit="batch"):
                _, updated_count, error = self._update_batch_worker(batch)
                if error:
                    total_errors += len(batch[1])
                    logging.error("Error updating batch %s: %s", batch[0] + 1, error)
                else:
                    total_updates += updated_count
        else:
            from concurrent.futures import ThreadPoolExecutor, as_completed

            with tqdm(total=len(updates), desc="Saving to database", unit="record") as pbar:
                with ThreadPoolExecutor(max_workers=num_workers) as executor:
                    futures = {
                        executor.submit(self._update_batch_worker, batch): batch
                        for batch in batches
                    }
                    for future in as_completed(futures):
                        batch_id, updated_count, error = future.result()
                        if error:
                            errored = len(batches[batch_id][1])
                            total_errors += errored
                            pbar.update(errored)
                            logging.error("Error updating batch %s: %s", batch_id + 1, error)
                        else:
                            total_updates += updated_count
                            pbar.update(updated_count)

        if total_errors:
            self.stats["errors"] += total_errors
        print(f"Updated {total_updates:,} records" + (f" ({total_errors:,} errors)" if total_errors else ""))
        return total_updates

    def _update_batch_worker(self, batch_data: tuple) -> tuple[int, int, str | None]:
        batch_id, batch, db_url = batch_data
        conn = None
        try:
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SET synchronous_commit = off")
            update_data = []
            for update in batch:
                distance = update["distance"]
                if distance is None or (
                    isinstance(distance, float)
                    and (math.isnan(distance) or math.isinf(distance))
                ):
                    distance_int = None
                else:
                    distance_int = int(round(distance * 1000))

                update_data.append(
                    (
                        distance_int,
                        update["classification"],
                        update["owner_id"],
                        update["housing_id"],
                        update["housing_geo_code"],
                    )
                )

            execute_values(
                cursor,
                """
                UPDATE owners_housing AS oh
                SET
                  locprop_distance_ban = CASE
                    WHEN data.distance IS NULL THEN NULL
                    ELSE data.distance::integer
                  END,
                  locprop_relative_ban = data.classification::integer
                FROM (VALUES %s) AS data(
                  distance, classification, owner_id, housing_id, housing_geo_code
                )
                WHERE oh.owner_id = data.owner_id::uuid
                  AND oh.housing_id = data.housing_id::uuid
                  AND oh.housing_geo_code = data.housing_geo_code::text
                """,
                update_data,
                page_size=1000,
            )
            conn.commit()
            cursor.close()
            conn.close()
            return (batch_id, len(batch), None)
        except Exception as error:
            if conn:
                try:
                    conn.rollback()
                    conn.close()
                except Exception:
                    pass
            return (batch_id, 0, str(error))

    def run(
        self,
        scope: LocationScope,
        limit: int | None = None,
        force: bool = False,
        dry_run: bool = False,
        batch_size: int = 50_000,
        num_workers: int = 1,
    ) -> LocationComputationReport:
        print("=" * 80)
        print("OWNER-HOUSING LOCATION CALCULATOR")
        print("=" * 80)
        print(f"Data file year: {scope.data_file_year}")
        if scope.establishment_id:
            print(f"Establishment: {scope.establishment_id}")
        if scope.geo_codes:
            print(f"Geo codes: {', '.join(scope.geo_codes)}")
        if limit:
            print(f"Limit: {limit:,} pairs")
        if dry_run:
            print("Dry-run: database updates disabled")
        if force:
            print("Force mode: recalculating existing values within scope")

        self.connect()
        classification_counts: Counter[int] = Counter()
        total_updated = 0
        processed = 0
        prepared = 0

        try:
            candidate_count = self.count_owner_housing_pairs(scope, force=force)
            report = LocationComputationReport(
                scope={
                    "data_file_year": scope.data_file_year,
                    "establishment_id": scope.establishment_id,
                    "geo_codes": list(scope.geo_codes),
                },
                dry_run=dry_run,
                force=force,
                limit=limit,
                candidate_count=candidate_count,
            )
            print(f"Candidate pairs: {candidate_count:,}")
            if candidate_count == 0:
                return report

            last_key = ZERO_KEY
            while True:
                if limit is not None and processed >= limit:
                    break
                current_batch_size = batch_size
                if limit is not None:
                    current_batch_size = min(current_batch_size, limit - processed)
                if current_batch_size <= 0:
                    break

                pairs = self.fetch_owner_housing_pair_batch(
                    scope,
                    last_key=last_key,
                    batch_size=current_batch_size,
                    force=force,
                )
                if not pairs:
                    break

                last = pairs[-1]
                last_key = (
                    last["owner_id"],
                    last["housing_id"],
                    last["housing_geo_code"],
                )

                address_cache = self.batch_get_address_data(pairs)
                updates = []
                for pair in tqdm(pairs, desc="Processing pairs", unit="pair"):
                    try:
                        distance, classification = self.process_single_pair(
                            pair["owner_id"], pair["housing_id"], address_cache
                        )
                        classification_counts[classification] += 1
                        updates.append(
                            {
                                "owner_id": pair["owner_id"],
                                "housing_id": pair["housing_id"],
                                "housing_geo_code": pair["housing_geo_code"],
                                "distance": distance,
                                "classification": classification,
                            }
                        )
                        processed += 1
                        self.stats["processed_pairs"] += 1
                    except Exception as error:
                        logging.debug(
                            "Error processing pair %s-%s: %s",
                            pair["owner_id"],
                            pair["housing_id"],
                            error,
                        )
                        self.stats["errors"] += 1

                prepared += len(updates)
                total_updated += self.update_database(
                    updates, num_workers=num_workers, dry_run=dry_run
                )

            report.processed_pairs = processed
            report.updates_prepared = prepared
            report.updated_pairs = total_updated
            report.errors = self.stats["errors"]
            report.classification_counts = {
                str(key): value for key, value in sorted(classification_counts.items())
            }
            report.stats = dict(self.stats)
            self.print_final_statistics(report)
            return report
        finally:
            self.disconnect()

    def print_final_statistics(self, report: LocationComputationReport) -> None:
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Candidate pairs: {report.candidate_count:,}")
        print(f"Pairs processed: {report.processed_pairs:,}")
        print(f"Updates prepared: {report.updates_prepared:,}")
        print(f"Rows updated: {report.updated_pairs:,}")
        print(f"Distances calculated: {self.stats['distances_calculated']:,}")
        print(f"Geographic rules applied: {self.stats['geographic_rules_applied']:,}")
        print(f"Classification counts: {json.dumps(report.classification_counts, sort_keys=True)}")
        if self.stats["errors"] > 0:
            print(f"Errors: {self.stats['errors']:,}")
        print("=" * 80)


def calculate_owner_housing_locations(
    db_url: str,
    data_file_year: str,
    establishment_id: str | None = None,
    geo_codes: list[str] | tuple[str, ...] | None = None,
    limit: int | None = None,
    force: bool = False,
    dry_run: bool = False,
    batch_size: int = 50_000,
    num_workers: int = 1,
) -> LocationComputationReport:
    scope = LocationScope(
        data_file_year=data_file_year,
        establishment_id=establishment_id,
        geo_codes=tuple(geo_codes or ()),
    )
    calculator = DistanceCalculator(db_url)
    return calculator.run(
        scope=scope,
        limit=limit,
        force=force,
        dry_run=dry_run,
        batch_size=batch_size,
        num_workers=num_workers,
    )


def setup_logging(verbose: bool = False) -> None:
    logging.basicConfig(
        level=logging.INFO if verbose else logging.WARNING,
        format="%(levelname)s - %(message)s",
    )


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be > 0")
    return parsed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Calculate scoped owner-housing relative locations"
    )
    parser.add_argument(
        "--db-url",
        default=os.environ.get("DATABASE_URL"),
        help="Database connection URL. Defaults to DATABASE_URL.",
    )
    parser.add_argument(
        "--data-file-year",
        required=True,
        help="Required LOVAC cohort, for example lovac-2026.",
    )
    parser.add_argument(
        "--establishment-id",
        help="Optional establishment UUID. Restricts processing to its geo codes.",
    )
    parser.add_argument(
        "--geo-code",
        dest="geo_codes",
        action="append",
        default=[],
        help="Optional INSEE geo code. Can be repeated.",
    )
    parser.add_argument("--limit", type=positive_int, help="Stop after N pairs.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recalculate existing values inside the selected scope.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Process and print counters without updating owners_housing.",
    )
    parser.add_argument(
        "--batch-size",
        type=positive_int,
        default=50_000,
        help="Owner-housing pairs fetched per DB batch.",
    )
    parser.add_argument(
        "--num-workers",
        type=positive_int,
        default=1,
        help="Parallel update workers. Keep low in production.",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable info logs.")

    args = parser.parse_args()
    setup_logging(verbose=args.verbose)

    if not args.db_url:
        parser.error("--db-url or DATABASE_URL is required")

    try:
        report = calculate_owner_housing_locations(
            db_url=args.db_url,
            data_file_year=args.data_file_year,
            establishment_id=args.establishment_id,
            geo_codes=args.geo_codes,
            limit=args.limit,
            force=args.force,
            dry_run=args.dry_run,
            batch_size=args.batch_size,
            num_workers=args.num_workers,
        )
        print(json.dumps(report.to_dict(), indent=2, sort_keys=True))
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(130)
    except Exception as error:
        print(f"\nFailed: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
