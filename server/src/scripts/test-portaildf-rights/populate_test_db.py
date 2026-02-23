#!/usr/bin/env python3
"""
Script to populate a test database with Portail DF test data.

This script reads tests.csv and creates:
- Establishments (structures)
- Users linked to establishments
- Basic perimeter information

Usage:
    python populate_test_db.py [--database-url URL] [--csv-file PATH] [--dry-run]

Environment variables:
    DATABASE_URL: PostgreSQL connection string
    TEST_PASSWORD: Password to use for test users (optional, default: 'test123')
"""

import argparse
import csv
import json
import os
import sys
import uuid
from datetime import datetime
from typing import Optional

import bcrypt
import psycopg2
from psycopg2.extras import execute_values


def parse_args():
    parser = argparse.ArgumentParser(
        description="Populate test database with Portail DF test data"
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL connection string (default: $DATABASE_URL)",
    )
    parser.add_argument(
        "--csv-file",
        default=os.path.join(os.path.dirname(__file__), "tests.csv"),
        help="Path to tests.csv file",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be done without making changes",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing test data before inserting",
    )
    return parser.parse_args()


def parse_array_field(value: str) -> list:
    """Parse a CSV array field like '[\"28404\"]' or '[]' into a Python list."""
    if not value or value == "[]":
        return []
    try:
        return json.loads(value.replace("'", '"'))
    except json.JSONDecodeError:
        return []


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def read_csv(filepath: str) -> list[dict]:
    """Read the CSV file and return a list of dictionaries."""
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def extract_establishments(rows: list[dict]) -> dict:
    """Extract unique establishments from CSV rows."""
    establishments = {}
    for row in rows:
        structure_id = row.get("structure")
        if structure_id and structure_id not in establishments:
            siret = row.get("structure_siret", "").replace(".0", "")
            siren = siret[:9] if len(siret) >= 9 else siret
            establishments[structure_id] = {
                "id": str(uuid.uuid4()),
                "original_id": structure_id,
                "siren": int(siren) if siren.isdigit() else None,
                "name": row.get("structure_raison_sociale", f"Structure {structure_id}"),
                "acces_lovac": row.get("structure_acces_lovac"),
                "niveau_acces": row.get("structure_niveau_acces"),
            }
    return establishments


def extract_users(rows: list[dict], establishments: dict, password_hash: str) -> list[dict]:
    """Extract users from CSV rows."""
    users = []
    seen_emails = set()
    now = datetime.now().isoformat()

    for row in rows:
        email = row.get("email", "").strip()
        if not email or email in seen_emails:
            continue
        seen_emails.add(email)

        structure_id = row.get("structure")
        establishment = establishments.get(structure_id, {})

        # Parse dates
        cgu_valide = row.get("cgu_valide", "")
        date_expiration = row.get("date_expiration", "")

        # Determine suspension status
        suspension_causes = []

        # Check CGU validation
        if not cgu_valide:
            suspension_causes.append("cgu vides")

        # Check date_expiration for user rights
        if date_expiration:
            try:
                exp_date = datetime.fromisoformat(date_expiration.replace("+00:00", "").replace("+01:00", "").replace("+02:00", ""))
                if exp_date < datetime.now():
                    suspension_causes.append("droits utilisateur expires")
            except ValueError:
                pass

        # Check structure access validity
        acces_lovac = establishment.get("acces_lovac", "")
        if acces_lovac:
            try:
                acces_date = datetime.fromisoformat(acces_lovac.replace("+00:00", "").replace("+01:00", "").replace("+02:00", ""))
                if acces_date < datetime.now():
                    suspension_causes.append("droits structure expires")
            except ValueError:
                pass

        # Check niveau_acces (should be 'lovac')
        niveau_acces = row.get("groupe_niveau_acces", "")
        if niveau_acces and niveau_acces not in ("lovac", "df_ano", "df_non_ano"):
            suspension_causes.append("niveau_acces_invalide")

        # Parse perimeter info
        perimetre_comm = parse_array_field(row.get("perimetre_comm", "[]"))
        perimetre_dep = parse_array_field(row.get("perimetre_dep", "[]"))
        perimetre_epci = parse_array_field(row.get("perimetre_epci", "[]"))
        perimetre_fr_entiere = row.get("perimetre_fr_entiere", "FALSE").upper() == "TRUE"

        # Determine if perimeter is valid (simplified check)
        has_perimeter = bool(perimetre_comm or perimetre_dep or perimetre_epci or perimetre_fr_entiere)

        is_gestionnaire = row.get("gestionnaire", "FALSE").upper() == "TRUE"
        is_exterieur = row.get("exterieur", "FALSE").upper() == "TRUE"

        suspended_at = now if suspension_causes else None
        suspended_cause = ", ".join(suspension_causes) if suspension_causes else None

        users.append({
            "id": str(uuid.uuid4()),
            "email": email,
            "password": password_hash,
            "first_name": email.split("@")[0].split(".")[0].capitalize() if "." in email.split("@")[0] else email.split("@")[0].capitalize(),
            "last_name": email.split("@")[0].split(".")[-1].upper() if "." in email.split("@")[0] else "USER",
            "establishment_id": establishment.get("id"),
            "role": 1,  # USUAL role
            "activated_at": now,
            "suspended_at": suspended_at,
            "suspended_cause": suspended_cause,
            "deleted_at": None,
            "updated_at": now,
            "phone": None,
            "position": "gestionnaire" if is_gestionnaire else ("externe" if is_exterieur else None),
            "time_per_week": None,
            "kind": "exterieur" if is_exterieur else "gestionnaire" if is_gestionnaire else None,
            # Metadata for reference
            "_original_id": row.get("id_user"),
            "_groupe": row.get("groupe"),
            "_groupe_nom": row.get("groupe_nom"),
            "_perimeter": {
                "comm": perimetre_comm,
                "dep": perimetre_dep,
                "epci": perimetre_epci,
                "fr_entiere": perimetre_fr_entiere,
            },
        })

    return users


def insert_establishments(conn, establishments: dict, dry_run: bool = False):
    """Insert establishments into the database."""
    if not establishments:
        print("No establishments to insert")
        return

    values = []
    for est in establishments.values():
        if est["siren"]:
            values.append((
                est["id"],
                est["name"],
                est["siren"],
                True,  # available
                [],  # localities_geo_code (empty for now)
                "EPCI",  # kind
                "lovac",  # source
                datetime.now(),  # updated_at
            ))

    if dry_run:
        print(f"Would insert {len(values)} establishments:")
        for v in values[:5]:
            print(f"  - {v[1]} (SIREN: {v[2]})")
        if len(values) > 5:
            print(f"  ... and {len(values) - 5} more")
        return

    if not values:
        print("No valid establishments to insert")
        return

    with conn.cursor() as cur:
        # Use ON CONFLICT to handle existing establishments
        execute_values(
            cur,
            """
            INSERT INTO establishments (id, name, siren, available, localities_geo_code, kind, source, updated_at)
            VALUES %s
            ON CONFLICT (siren) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = EXCLUDED.updated_at
            """,
            values,
        )
    conn.commit()
    print(f"Inserted/updated {len(values)} establishments")


def insert_users(conn, users: list[dict], dry_run: bool = False):
    """Insert users into the database."""
    if not users:
        print("No users to insert")
        return

    # Filter out metadata keys
    values = []
    for user in users:
        if user["establishment_id"]:
            values.append((
                user["id"],
                user["email"],
                user["password"],
                user["first_name"],
                user["last_name"],
                user["establishment_id"],
                user["role"],
                user["activated_at"],
                user["suspended_at"],
                user["suspended_cause"],
                user["deleted_at"],
                user["updated_at"],
                user["phone"],
                user["position"],
                user["time_per_week"],
                user["kind"],
            ))

    if dry_run:
        print(f"Would insert {len(values)} users:")
        for user in users[:10]:
            status = "SUSPENDED" if user["suspended_at"] else "ACTIVE"
            cause = f" ({user['suspended_cause']})" if user["suspended_cause"] else ""
            print(f"  - {user['email']}: {status}{cause}")
        if len(values) > 10:
            print(f"  ... and {len(values) - 10} more")
        return

    if not values:
        print("No valid users to insert")
        return

    with conn.cursor() as cur:
        # Use ON CONFLICT to handle existing users
        execute_values(
            cur,
            """
            INSERT INTO users (
                id, email, password, first_name, last_name, establishment_id,
                role, activated_at, suspended_at, suspended_cause, deleted_at,
                updated_at, phone, position, time_per_week, kind
            )
            VALUES %s
            ON CONFLICT (email) DO UPDATE SET
                establishment_id = EXCLUDED.establishment_id,
                suspended_at = EXCLUDED.suspended_at,
                suspended_cause = EXCLUDED.suspended_cause,
                updated_at = EXCLUDED.updated_at
            """,
            values,
        )
    conn.commit()
    print(f"Inserted/updated {len(values)} users")


def clear_test_data(conn, dry_run: bool = False):
    """Clear existing test data."""
    if dry_run:
        print("Would clear test data (users with emails from tests.csv)")
        return

    with conn.cursor() as cur:
        # Only delete users with specific test patterns
        cur.execute("""
            DELETE FROM users
            WHERE email LIKE '%@zlv.fr'
            OR email IN (SELECT DISTINCT email FROM users WHERE email LIKE '%test%')
        """)
        deleted = cur.rowcount
    conn.commit()
    print(f"Cleared {deleted} test users")


def print_summary(establishments: dict, users: list[dict]):
    """Print a summary of the data to be inserted."""
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Establishments: {len(establishments)}")
    print(f"Users: {len(users)}")

    # Count by suspension status
    active = sum(1 for u in users if not u["suspended_at"])
    suspended = sum(1 for u in users if u["suspended_at"])
    print(f"  - Active: {active}")
    print(f"  - Suspended: {suspended}")

    # Count by suspension cause
    causes = {}
    for u in users:
        if u["suspended_cause"]:
            for cause in u["suspended_cause"].split(", "):
                causes[cause] = causes.get(cause, 0) + 1

    if causes:
        print("\nSuspension causes:")
        for cause, count in sorted(causes.items()):
            print(f"  - {cause}: {count}")

    print("=" * 60 + "\n")


def main():
    args = parse_args()

    if not args.database_url:
        print("Error: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    # Read CSV
    print(f"Reading CSV: {args.csv_file}")
    rows = read_csv(args.csv_file)
    print(f"Found {len(rows)} rows")

    # Get password
    password = os.environ.get("TEST_PASSWORD", "test123")
    password_hash = hash_password(password)

    # Extract data
    establishments = extract_establishments(rows)
    users = extract_users(rows, establishments, password_hash)

    # Print summary
    print_summary(establishments, users)

    if args.dry_run:
        print("DRY RUN - No changes will be made\n")

    # Connect to database
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(args.database_url)
        print("Connected successfully")
    except psycopg2.Error as e:
        print(f"Error connecting to database: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        # Clear existing data if requested
        if args.clear:
            clear_test_data(conn, args.dry_run)

        # Insert data
        insert_establishments(conn, establishments, args.dry_run)

        # Refresh establishments to get actual IDs (in case of conflicts)
        if not args.dry_run:
            with conn.cursor() as cur:
                cur.execute("SELECT id, siren FROM establishments")
                siren_to_id = {str(row[1]): row[0] for row in cur.fetchall()}

            # Update user establishment_id references
            for user in users:
                original_id = None
                for est in establishments.values():
                    if est["id"] == user["establishment_id"]:
                        original_id = str(est["siren"])
                        break
                if original_id and original_id in siren_to_id:
                    user["establishment_id"] = siren_to_id[original_id]

        insert_users(conn, users, args.dry_run)

        print("\nDone!")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
