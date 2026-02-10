#!/usr/bin/env python3
"""
Detect, migrate, and optionally delete orphan establishments in the database.

An orphan establishment is one that exists in the database but is not present
in the Gold CSV source file. This helps identify establishments that may need
to be deactivated or removed after an import.

Usage:
    # Dry-run (default): just report orphans with statistics
    python detect_orphan_establishments.py --csv collectivities_processed.csv --db-url postgresql://user:pass@host:port/db

    # Export orphans to CSV
    python detect_orphan_establishments.py --csv collectivities_processed.csv --db-url postgresql://user:pass@host:port/db --output orphans.csv

    # Delete safe orphans (no users, no campaigns, no groups)
    python detect_orphan_establishments.py --csv collectivities_processed.csv --db-url postgresql://user:pass@host:port/db --delete

    # Migrate data from one establishment to another (for orphans with data)
    python detect_orphan_establishments.py --csv collectivities_processed.csv --db-url postgresql://user:pass@host:port/db --migrate-from 123456789 --migrate-to 987654321
"""

import argparse
import ast
import csv
import sys
from typing import Set

import psycopg2
from psycopg2.extras import RealDictCursor


def load_csv_sirens(csv_path: str) -> Set[int]:
    """Load all valid SIRENs from the CSV file."""
    sirens = set()

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            siren_str = row.get("Siren", "").strip()

            if not siren_str:
                continue

            # Handle decimal format (e.g., "239710015.0")
            if "." in siren_str:
                siren_str = siren_str.split(".")[0]

            # Validate: SIREN should be 9 digits
            if siren_str.isdigit() and len(siren_str) == 9:
                sirens.add(int(siren_str))

    return sirens


def load_db_establishments(db_url: str) -> list:
    """Load all establishments from the database."""
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT
            id,
            siren,
            name,
            kind,
            localities_geo_code,
            updated_at
        FROM establishments
        WHERE siren IS NOT NULL
        ORDER BY name
    """)

    establishments = cursor.fetchall()

    cursor.close()
    conn.close()

    return establishments


def detect_orphans(csv_sirens: Set[int], db_establishments: list) -> list:
    """Find establishments in DB that are not in CSV."""
    orphans = []

    for est in db_establishments:
        if est["siren"] not in csv_sirens:
            orphans.append(est)

    return orphans


def check_orphan_usage(db_url: str, orphan_ids: list) -> dict:
    """Check if orphan establishments have associated data (users, campaigns, groups, etc.)."""
    if not orphan_ids:
        return {}

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Initialize usage dict
    usage = {oid: {"users": 0, "campaigns": 0, "groups": 0, "geo_perimeters": 0, "drafts": 0, "contact_points": 0, "senders": 0, "settings": 0} for oid in orphan_ids}

    # Check users
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM users
        WHERE establishment_id = ANY(%s)
          AND deleted_at IS NULL
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["users"] = row["cnt"]

    # Check campaigns
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM campaigns
        WHERE establishment_id = ANY(%s)
          AND deleted_at IS NULL
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["campaigns"] = row["cnt"]

    # Check groups
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM groups
        WHERE establishment_id = ANY(%s)
          AND archived_at IS NULL
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["groups"] = row["cnt"]

    # Check geo_perimeters
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM geo_perimeters
        WHERE establishment_id = ANY(%s)
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["geo_perimeters"] = row["cnt"]

    # Check drafts
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM drafts
        WHERE establishment_id = ANY(%s)
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["drafts"] = row["cnt"]

    # Check contact_points
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM contact_points
        WHERE establishment_id = ANY(%s)
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["contact_points"] = row["cnt"]

    # Check senders
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM senders
        WHERE establishment_id = ANY(%s)
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["senders"] = row["cnt"]

    # Check settings
    cursor.execute("""
        SELECT establishment_id, COUNT(*) as cnt
        FROM settings
        WHERE establishment_id = ANY(%s)
        GROUP BY establishment_id
    """, (orphan_ids,))
    for row in cursor.fetchall():
        usage[row["establishment_id"]]["settings"] = row["cnt"]

    cursor.close()
    conn.close()

    return usage


def is_safe_to_delete(est_usage: dict) -> bool:
    """Check if an establishment is safe to delete (no critical data)."""
    # Critical: users, campaigns, groups with data
    return (
        est_usage.get("users", 0) == 0 and
        est_usage.get("campaigns", 0) == 0 and
        est_usage.get("groups", 0) == 0
    )


def export_to_csv(orphans: list, usage: dict, output_path: str):
    """Export orphan establishments to CSV."""
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "id",
            "siren",
            "name",
            "kind",
            "localities_count",
            "users",
            "campaigns",
            "groups",
            "geo_perimeters",
            "drafts",
            "contact_points",
            "senders",
            "settings",
            "updated_at",
            "can_delete"
        ])

        for orphan in orphans:
            est_id = orphan["id"]
            localities = orphan.get("localities_geo_code") or []
            est_usage = usage.get(est_id, {})

            writer.writerow([
                est_id,
                orphan["siren"],
                orphan["name"],
                orphan["kind"],
                len(localities),
                est_usage.get("users", 0),
                est_usage.get("campaigns", 0),
                est_usage.get("groups", 0),
                est_usage.get("geo_perimeters", 0),
                est_usage.get("drafts", 0),
                est_usage.get("contact_points", 0),
                est_usage.get("senders", 0),
                est_usage.get("settings", 0),
                orphan["updated_at"],
                "Yes" if is_safe_to_delete(est_usage) else "No"
            ])


def get_deletable_orphans(orphans: list, usage: dict) -> list:
    """Filter orphans that are safe to delete (no users, no campaigns, no groups)."""
    deletable = []
    for orphan in orphans:
        est_id = orphan["id"]
        est_usage = usage.get(est_id, {})
        if is_safe_to_delete(est_usage):
            deletable.append(orphan)
    return deletable


def migrate_establishment_data(db_url: str, source_id: str, target_id: str) -> dict:
    """Migrate all data from source establishment to target establishment."""
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    migrated = {}

    # Migrate users
    cursor.execute("""
        UPDATE users
        SET establishment_id = %s
        WHERE establishment_id = %s
    """, (target_id, source_id))
    migrated["users"] = cursor.rowcount

    # Migrate campaigns
    cursor.execute("""
        UPDATE campaigns
        SET establishment_id = %s
        WHERE establishment_id = %s
    """, (target_id, source_id))
    migrated["campaigns"] = cursor.rowcount

    # Migrate groups
    cursor.execute("""
        UPDATE groups
        SET establishment_id = %s
        WHERE establishment_id = %s
    """, (target_id, source_id))
    migrated["groups"] = cursor.rowcount

    # Migrate geo_perimeters
    cursor.execute("""
        UPDATE geo_perimeters
        SET establishment_id = %s
        WHERE establishment_id = %s
    """, (target_id, source_id))
    migrated["geo_perimeters"] = cursor.rowcount

    # Migrate drafts
    cursor.execute("""
        UPDATE drafts
        SET establishment_id = %s
        WHERE establishment_id = %s
    """, (target_id, source_id))
    migrated["drafts"] = cursor.rowcount

    # Migrate contact_points
    cursor.execute("""
        UPDATE contact_points
        SET establishment_id = %s
        WHERE establishment_id = %s
    """, (target_id, source_id))
    migrated["contact_points"] = cursor.rowcount

    # Migrate senders
    cursor.execute("""
        UPDATE senders
        SET establishment_id = %s
        WHERE establishment_id = %s
    """, (target_id, source_id))
    migrated["senders"] = cursor.rowcount

    # Migrate settings (may conflict, so we delete instead)
    cursor.execute("""
        DELETE FROM settings
        WHERE establishment_id = %s
    """, (source_id,))
    migrated["settings_deleted"] = cursor.rowcount

    conn.commit()
    cursor.close()
    conn.close()

    return migrated


def get_establishment_by_siren(db_url: str, siren: int) -> dict:
    """Get establishment by SIREN."""
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT id, siren, name, kind
        FROM establishments
        WHERE siren = %s
    """, (siren,))

    result = cursor.fetchone()

    cursor.close()
    conn.close()

    return result


def delete_orphans(db_url: str, orphans: list) -> dict:
    """Delete orphan establishments and related data from the database."""
    if not orphans:
        return {"establishments": 0}

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    orphan_ids = [o["id"] for o in orphans]
    deleted = {}

    # Delete from related tables first (cascade won't handle all of these)
    tables_to_clean = [
        ("establishments_localities", "establishment_id"),
        ("geo_perimeters", "establishment_id"),
        ("drafts", "establishment_id"),
        ("contact_points", "establishment_id"),
        ("senders", "establishment_id"),
        ("settings", "establishment_id"),
    ]

    for table, column in tables_to_clean:
        cursor.execute(f"""
            DELETE FROM {table}
            WHERE {column} = ANY(%s)
        """, (orphan_ids,))
        deleted[table] = cursor.rowcount

    # Delete establishments
    cursor.execute("""
        DELETE FROM establishments
        WHERE id = ANY(%s)
    """, (orphan_ids,))
    deleted["establishments"] = cursor.rowcount

    conn.commit()
    cursor.close()
    conn.close()

    return deleted


def print_statistics(orphans: list, usage: dict, db_establishments: list, csv_sirens: Set[int]):
    """Print detailed statistics report."""
    # Count by kind
    by_kind = {}
    for orphan in orphans:
        kind = orphan["kind"] or "UNKNOWN"
        if kind not in by_kind:
            by_kind[kind] = {"total": 0, "deletable": 0, "in_use": 0}
        by_kind[kind]["total"] += 1

        est_usage = usage.get(orphan["id"], {})
        if is_safe_to_delete(est_usage):
            by_kind[kind]["deletable"] += 1
        else:
            by_kind[kind]["in_use"] += 1

    # Overall stats
    total_orphans = len(orphans)
    deletable = sum(1 for o in orphans if is_safe_to_delete(usage.get(o["id"], {})))
    in_use = total_orphans - deletable

    # Sum all usage types
    total_users = sum(usage.get(o["id"], {}).get("users", 0) for o in orphans)
    total_campaigns = sum(usage.get(o["id"], {}).get("campaigns", 0) for o in orphans)
    total_groups = sum(usage.get(o["id"], {}).get("groups", 0) for o in orphans)
    total_geo_perimeters = sum(usage.get(o["id"], {}).get("geo_perimeters", 0) for o in orphans)
    total_drafts = sum(usage.get(o["id"], {}).get("drafts", 0) for o in orphans)
    total_contact_points = sum(usage.get(o["id"], {}).get("contact_points", 0) for o in orphans)
    total_senders = sum(usage.get(o["id"], {}).get("senders", 0) for o in orphans)
    total_settings = sum(usage.get(o["id"], {}).get("settings", 0) for o in orphans)

    # Count orphans with each type of data
    with_users = sum(1 for o in orphans if usage.get(o["id"], {}).get("users", 0) > 0)
    with_campaigns = sum(1 for o in orphans if usage.get(o["id"], {}).get("campaigns", 0) > 0)
    with_groups = sum(1 for o in orphans if usage.get(o["id"], {}).get("groups", 0) > 0)
    with_geo_perimeters = sum(1 for o in orphans if usage.get(o["id"], {}).get("geo_perimeters", 0) > 0)
    with_drafts = sum(1 for o in orphans if usage.get(o["id"], {}).get("drafts", 0) > 0)
    with_contact_points = sum(1 for o in orphans if usage.get(o["id"], {}).get("contact_points", 0) > 0)
    with_senders = sum(1 for o in orphans if usage.get(o["id"], {}).get("senders", 0) > 0)
    with_settings = sum(1 for o in orphans if usage.get(o["id"], {}).get("settings", 0) > 0)

    print("\n" + "=" * 80)
    print("STATISTICS REPORT")
    print("=" * 80)

    print("\n📊 OVERVIEW")
    print(f"  Total establishments in DB:     {len(db_establishments):>6,}")
    print(f"  Total SIRENs in CSV:            {len(csv_sirens):>6,}")
    print(f"  Orphan establishments:          {total_orphans:>6,} ({100*total_orphans/len(db_establishments):.1f}%)")

    print("\n📋 ORPHAN BREAKDOWN")
    print(f"  Safe to delete (no critical data):  {deletable:>6,} ({100*deletable/total_orphans:.1f}%)")
    print(f"  In use (has critical data):         {in_use:>6,} ({100*in_use/total_orphans:.1f}%)")

    print("\n📈 ASSOCIATED DATA IMPACT")
    print(f"  {'Data Type':<20} {'Orphans With':>12} {'Total Count':>12}")
    print(f"  {'-'*20} {'-'*12} {'-'*12}")
    print(f"  {'Users (active)':<20} {with_users:>12,} {total_users:>12,}")
    print(f"  {'Campaigns':<20} {with_campaigns:>12,} {total_campaigns:>12,}")
    print(f"  {'Groups':<20} {with_groups:>12,} {total_groups:>12,}")
    print(f"  {'Geo Perimeters':<20} {with_geo_perimeters:>12,} {total_geo_perimeters:>12,}")
    print(f"  {'Drafts':<20} {with_drafts:>12,} {total_drafts:>12,}")
    print(f"  {'Contact Points':<20} {with_contact_points:>12,} {total_contact_points:>12,}")
    print(f"  {'Senders':<20} {with_senders:>12,} {total_senders:>12,}")
    print(f"  {'Settings':<20} {with_settings:>12,} {total_settings:>12,}")

    print("\n⚠️  CRITICAL DATA (blocks deletion)")
    print(f"  Users, Campaigns, Groups are considered critical.")
    print(f"  Geo Perimeters, Drafts, Contact Points, Senders, Settings")
    print(f"  will be cascade-deleted with the establishment.")

    print("\n📁 BY ESTABLISHMENT TYPE")
    print(f"  {'Kind':<15} {'Total':>8} {'Deletable':>10} {'In Use':>8}")
    print(f"  {'-'*15} {'-'*8} {'-'*10} {'-'*8}")
    for kind in sorted(by_kind.keys(), key=lambda k: by_kind[k]["total"], reverse=True):
        stats = by_kind[kind]
        print(f"  {kind:<15} {stats['total']:>8,} {stats['deletable']:>10,} {stats['in_use']:>8,}")


def main():
    parser = argparse.ArgumentParser(
        description="Detect and optionally delete orphan establishments (in DB but not in CSV)"
    )

    parser.add_argument(
        "--csv",
        required=True,
        help="Path to the gold establishments CSV file",
    )
    parser.add_argument(
        "--db-url",
        required=True,
        help="PostgreSQL connection URI",
    )
    parser.add_argument(
        "--output",
        help="Output CSV file for orphan report (optional)",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete safe orphans (those without users or campaigns)",
    )
    parser.add_argument(
        "--migrate-from",
        type=int,
        help="SIREN of the orphan establishment to migrate data FROM",
    )
    parser.add_argument(
        "--migrate-to",
        type=int,
        help="SIREN of the target establishment to migrate data TO",
    )

    args = parser.parse_args()

    # Determine mode
    if args.migrate_from and args.migrate_to:
        mode = f"MIGRATE ({args.migrate_from} → {args.migrate_to})"
    elif args.delete:
        mode = "DELETE"
    else:
        mode = "DRY-RUN (report only)"

    print("=" * 80)
    print("ORPHAN ESTABLISHMENTS DETECTOR")
    print("=" * 80)
    print(f"CSV file: {args.csv}")
    print(f"Mode: {mode}")
    print()

    # Load data
    print("Loading SIRENs from CSV...")
    csv_sirens = load_csv_sirens(args.csv)
    print(f"  Found {len(csv_sirens):,} unique SIRENs in CSV")

    print("Loading establishments from database...")
    db_establishments = load_db_establishments(args.db_url)
    print(f"  Found {len(db_establishments):,} establishments in database")

    # Detect orphans
    print("\nDetecting orphans...")
    orphans = detect_orphans(csv_sirens, db_establishments)
    print(f"  Found {len(orphans):,} orphan establishments")

    if not orphans:
        print("\n✅ No orphan establishments found!")
        return

    # Check usage
    print("\nChecking orphan usage (users, campaigns)...")
    orphan_ids = [o["id"] for o in orphans]
    usage = check_orphan_usage(args.db_url, orphan_ids)

    # Print statistics
    print_statistics(orphans, usage, db_establishments, csv_sirens)

    # Get deletable orphans
    deletable_orphans = get_deletable_orphans(orphans, usage)

    # Show sample
    print("\n--- Sample orphans (first 10) ---")
    for orphan in orphans[:10]:
        est_id = orphan["id"]
        est_usage = usage.get(est_id, {})
        safe = is_safe_to_delete(est_usage)
        status = "✅ deletable" if safe else "⚠️ IN USE"

        # Build usage summary
        usage_parts = []
        if est_usage.get("users", 0) > 0:
            usage_parts.append(f"{est_usage['users']} users")
        if est_usage.get("campaigns", 0) > 0:
            usage_parts.append(f"{est_usage['campaigns']} campaigns")
        if est_usage.get("groups", 0) > 0:
            usage_parts.append(f"{est_usage['groups']} groups")
        if est_usage.get("geo_perimeters", 0) > 0:
            usage_parts.append(f"{est_usage['geo_perimeters']} perimeters")

        usage_str = f" ({', '.join(usage_parts)})" if usage_parts else ""
        print(f"  SIREN={orphan['siren']}, {orphan['name'][:35]:<35}, {orphan['kind']:<10} {status}{usage_str}")

    if len(orphans) > 10:
        print(f"  ... and {len(orphans) - 10} more")

    # Export if requested
    if args.output:
        print(f"\nExporting to {args.output}...")
        export_to_csv(orphans, usage, args.output)
        print(f"✅ Exported {len(orphans)} orphans to {args.output}")

    # Migrate if requested
    if args.migrate_from and args.migrate_to:
        print("\n" + "=" * 80)
        print("MIGRATE MODE")
        print("=" * 80)

        # Get source establishment
        source = get_establishment_by_siren(args.db_url, args.migrate_from)
        if not source:
            print(f"❌ Source establishment with SIREN {args.migrate_from} not found in database.")
            return

        # Get target establishment
        target = get_establishment_by_siren(args.db_url, args.migrate_to)
        if not target:
            print(f"❌ Target establishment with SIREN {args.migrate_to} not found in database.")
            return

        # Check if source is an orphan
        is_orphan = args.migrate_from not in csv_sirens
        if not is_orphan:
            print(f"⚠️  Warning: SIREN {args.migrate_from} is NOT an orphan (exists in CSV).")

        # Check if target is in CSV
        target_in_csv = args.migrate_to in csv_sirens
        if not target_in_csv:
            print(f"⚠️  Warning: Target SIREN {args.migrate_to} is also an orphan!")

        # Get source usage
        source_usage = check_orphan_usage(args.db_url, [source["id"]])
        source_data = source_usage.get(source["id"], {})

        print(f"\nSource establishment:")
        print(f"  SIREN: {source['siren']}")
        print(f"  Name:  {source['name']}")
        print(f"  Kind:  {source['kind']}")
        print(f"  Data:  {source_data.get('users', 0)} users, {source_data.get('campaigns', 0)} campaigns, "
              f"{source_data.get('groups', 0)} groups, {source_data.get('geo_perimeters', 0)} perimeters")

        print(f"\nTarget establishment:")
        print(f"  SIREN: {target['siren']}")
        print(f"  Name:  {target['name']}")
        print(f"  Kind:  {target['kind']}")

        print("\n⚠️  WARNING: This will move ALL data from source to target!")
        print("After migration, the source establishment can be safely deleted.")

        confirm = input("\nType 'MIGRATE' to confirm: ").strip()

        if confirm == "MIGRATE":
            print("\nMigrating data...")
            migrated = migrate_establishment_data(args.db_url, source["id"], target["id"])

            print("\n✅ Migration complete:")
            print(f"  Users migrated:           {migrated.get('users', 0):>6,}")
            print(f"  Campaigns migrated:       {migrated.get('campaigns', 0):>6,}")
            print(f"  Groups migrated:          {migrated.get('groups', 0):>6,}")
            print(f"  Geo perimeters migrated:  {migrated.get('geo_perimeters', 0):>6,}")
            print(f"  Drafts migrated:          {migrated.get('drafts', 0):>6,}")
            print(f"  Contact points migrated:  {migrated.get('contact_points', 0):>6,}")
            print(f"  Senders migrated:         {migrated.get('senders', 0):>6,}")
            print(f"  Settings deleted:         {migrated.get('settings_deleted', 0):>6,}")

            print(f"\n💡 Source establishment (SIREN {args.migrate_from}) can now be safely deleted.")
            print(f"   Run with --delete to remove all safe orphans.")
        else:
            print("❌ Migration cancelled.")

        return

    elif args.migrate_from or args.migrate_to:
        print("\n❌ Error: Both --migrate-from and --migrate-to must be specified together.")
        return

    # Delete if requested
    if args.delete:
        print("\n" + "=" * 80)
        print("DELETE MODE")
        print("=" * 80)

        if not deletable_orphans:
            print("No safe orphans to delete (all have users or campaigns).")
        else:
            print(f"About to delete {len(deletable_orphans):,} orphan establishments.")
            print("These establishments have NO active users and NO campaigns.")
            print("\n⚠️  WARNING: This action is IRREVERSIBLE!")

            confirm = input("\nType 'DELETE' to confirm: ").strip()

            if confirm == "DELETE":
                print("\nDeleting orphan establishments and related data...")
                deleted = delete_orphans(args.db_url, deletable_orphans)

                print("\n✅ Deletion complete:")
                print(f"  Establishments deleted:         {deleted.get('establishments', 0):>6,}")
                print(f"  Localities links deleted:       {deleted.get('establishments_localities', 0):>6,}")
                print(f"  Geo perimeters deleted:         {deleted.get('geo_perimeters', 0):>6,}")
                print(f"  Drafts deleted:                 {deleted.get('drafts', 0):>6,}")
                print(f"  Contact points deleted:         {deleted.get('contact_points', 0):>6,}")
                print(f"  Senders deleted:                {deleted.get('senders', 0):>6,}")
                print(f"  Settings deleted:               {deleted.get('settings', 0):>6,}")
            else:
                print("❌ Deletion cancelled.")
    else:
        print("\n" + "-" * 80)
        print("💡 To delete safe orphans, run with --delete flag")
        print("-" * 80)

    print()


if __name__ == "__main__":
    main()
