#!/usr/bin/env python3
"""
Export users with LOVAC access from Portail DF API.

This script fetches all users who have access to LOVAC by:
1. Getting all structures with acces_lovac=true
2. Getting all users associated with those structures

Usage:
    export CEREMA_BEARER_TOKEN="your_token"
    python export-lovac-users.py

    # Or with token as argument
    python export-lovac-users.py --token "your_token"

    # Custom output file
    python export-lovac-users.py --output lovac_users.csv
"""

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional, Set

import requests


class LovacUsersExporter:
    """Export users with LOVAC access from Portail DF."""

    def __init__(self, token: str, base_url: str = "https://portaildf.cerema.fr/api"):
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        })

        self.stats = {
            "structures_total": 0,
            "structures_lovac": 0,
            "users_total": 0,
        }

    def fetch_all_pages(self, endpoint: str, desc: str = "Fetching") -> List[Dict]:
        """Fetch all pages from a paginated API endpoint."""
        results = []
        url = f"{self.base_url}/{endpoint}"
        page = 1

        while url:
            print(f"\r{desc}... page {page}", end="", flush=True)

            try:
                response = self.session.get(url, timeout=60)
                response.raise_for_status()
                data = response.json()

                items = data.get("results", [])
                results.extend(items)

                url = data.get("next")
                page += 1

                # Rate limiting
                time.sleep(0.3)

            except requests.exceptions.RequestException as e:
                print(f"\n❌ Error fetching {url}: {e}")
                break

        print(f"\r{desc}... {len(results)} items fetched")
        return results

    def get_structures_with_lovac(self) -> Dict[int, Dict]:
        """Get all structures that have LOVAC access."""
        structures = self.fetch_all_pages("structures", "Fetching structures")
        self.stats["structures_total"] = len(structures)

        # Filter structures with LOVAC access (acces_lovac is a date, not null = has access)
        lovac_structures = {}
        for s in structures:
            acces_lovac = s.get("acces_lovac")
            if acces_lovac is not None:  # Has LOVAC access if date is set
                struct_id = s.get("id_structure") or s.get("id")
                if struct_id:
                    lovac_structures[struct_id] = {
                        "id": struct_id,
                        "raison_sociale": s.get("raison_sociale", ""),
                        "siret": s.get("siret", ""),
                        "niveau_acces": s.get("niveau_acces", ""),
                        "acces_lovac": acces_lovac,
                    }

        self.stats["structures_lovac"] = len(lovac_structures)
        print(f"  → {len(lovac_structures)} structures with LOVAC access")

        return lovac_structures

    def get_all_users(self) -> List[Dict]:
        """Get all users from the API."""
        users = self.fetch_all_pages("utilisateurs", "Fetching users")
        self.stats["users_total"] = len(users)
        return users

    def filter_users_with_lovac(
        self, users: List[Dict], lovac_structures: Dict[int, Dict]
    ) -> List[Dict]:
        """Filter users who belong to structures with LOVAC access."""
        lovac_users = []

        for user in users:
            # Get user's structure ID
            structure_id = user.get("structure")

            # If structure is a dict, extract ID
            if isinstance(structure_id, dict):
                structure_id = structure_id.get("id_structure") or structure_id.get("id")

            if structure_id and structure_id in lovac_structures:
                structure = lovac_structures[structure_id]
                lovac_users.append({
                    "email": user.get("email", ""),
                    "id_user": user.get("id_user", ""),
                    "exterieur": user.get("exterieur", False),
                    "gestionnaire": user.get("gestionnaire", False),
                    "date_rattachement": user.get("date_rattachement", ""),
                    "date_expiration": user.get("date_expiration", ""),
                    "cgu_valide": user.get("cgu_valide", ""),
                    "structure_id": structure_id,
                    "structure_raison_sociale": structure["raison_sociale"],
                    "structure_siret": structure["siret"],
                    "structure_niveau_acces": structure["niveau_acces"],
                    "structure_acces_lovac": structure["acces_lovac"],
                })

        return lovac_users

    def export_to_csv(self, users: List[Dict], output_path: str):
        """Export users to CSV file."""
        if not users:
            print("⚠️  No users to export")
            return

        fieldnames = [
            "email",
            "id_user",
            "exterieur",
            "gestionnaire",
            "date_rattachement",
            "date_expiration",
            "cgu_valide",
            "structure_id",
            "structure_raison_sociale",
            "structure_siret",
            "structure_niveau_acces",
            "structure_acces_lovac",
        ]

        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(users)

        print(f"✅ Exported {len(users)} users to {output_path}")

    def export_to_json(self, users: List[Dict], output_path: str):
        """Export users to JSON file."""
        if not users:
            print("⚠️  No users to export")
            return

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(users, f, ensure_ascii=False, indent=2)

        print(f"✅ Exported {len(users)} users to {output_path}")

    def run(self, output_path: str, format: str = "csv"):
        """Main execution."""
        print("=" * 60)
        print("LOVAC USERS EXPORT")
        print("=" * 60)
        print(f"API: {self.base_url}")
        print(f"Output: {output_path}")
        print()

        # Step 1: Get structures with LOVAC access
        print("Step 1/3: Getting structures with LOVAC access...")
        lovac_structures = self.get_structures_with_lovac()

        if not lovac_structures:
            print("❌ No structures with LOVAC access found")
            return

        # Step 2: Get all users
        print("\nStep 2/3: Getting all users...")
        all_users = self.get_all_users()

        # Step 3: Filter users with LOVAC access
        print("\nStep 3/3: Filtering users with LOVAC access...")
        lovac_users = self.filter_users_with_lovac(all_users, lovac_structures)

        # Sort by structure then email
        lovac_users.sort(key=lambda u: (u["structure_raison_sociale"], u["email"]))

        print(f"  → {len(lovac_users)} users with LOVAC access")

        # Export
        print()
        if format == "json":
            self.export_to_json(lovac_users, output_path)
        else:
            self.export_to_csv(lovac_users, output_path)

        # Summary
        print()
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total structures:        {self.stats['structures_total']:>6,}")
        print(f"Structures with LOVAC:   {self.stats['structures_lovac']:>6,}")
        print(f"Total users:             {self.stats['users_total']:>6,}")
        print(f"Users with LOVAC access: {len(lovac_users):>6,}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Export users with LOVAC access from Portail DF"
    )

    parser.add_argument(
        "--token", "-t",
        default=os.environ.get("CEREMA_BEARER_TOKEN"),
        help="Bearer token for API (or set CEREMA_BEARER_TOKEN env var)",
    )
    parser.add_argument(
        "--output", "-o",
        default=f"lovac_users_{datetime.now().strftime('%Y%m%d')}.csv",
        help="Output file path (default: lovac_users_YYYYMMDD.csv)",
    )
    parser.add_argument(
        "--format", "-f",
        choices=["csv", "json"],
        default="csv",
        help="Output format (default: csv)",
    )
    parser.add_argument(
        "--base-url",
        default="https://portaildf.cerema.fr/api",
        help="API base URL",
    )

    args = parser.parse_args()

    if not args.token:
        print("❌ Error: Bearer token required")
        print("   Set CEREMA_BEARER_TOKEN or use --token")
        sys.exit(1)

    exporter = LovacUsersExporter(
        token=args.token,
        base_url=args.base_url,
    )

    try:
        exporter.run(args.output, args.format)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
