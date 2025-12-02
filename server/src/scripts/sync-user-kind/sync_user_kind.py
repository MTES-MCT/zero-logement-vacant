#!/usr/bin/env python3
"""
Synchronize user 'kind' field from Portail DF API.

This script fetches user data from the Portail DF API and updates the 'kind' column
in the local users table based on the 'exterieur' and 'gestionnaire' fields.

Mapping Rules:
- exterieur=true, gestionnaire=false  → kind='prestataire'
- exterieur=false, gestionnaire=true  → kind='gestionnaire'
- exterieur=true, gestionnaire=true   → kind='prestataire, gestionnaire'
- exterieur=false, gestionnaire=false → kind='aucun'

Usage:
    python sync_user_kind.py --db-url <url> --api-url <url>
    python sync_user_kind.py --db-url <url> --api-url <url> --dry-run
    python sync_user_kind.py --db-url <url> --api-url <url> --limit 100
"""

import argparse
import logging
import psycopg2
import requests
from psycopg2.extras import RealDictCursor, execute_values
from tqdm import tqdm
from datetime import datetime
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed


class UserKindSync:
    """Synchronize user kind from Portail DF API."""

    def __init__(
        self,
        db_url: str,
        api_url: str,
        dry_run: bool = False,
        batch_size: int = 1000,
        num_workers: int = 4,
    ):
        """
        Initialize the sync processor.

        Args:
            db_url: PostgreSQL connection URI
            api_url: Portail DF API base URL
            dry_run: Simulation mode (no database modifications)
            batch_size: Batch size for database operations
            num_workers: Number of parallel workers
        """
        self.db_url = db_url
        self.api_url = api_url.rstrip("/")
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.num_workers = num_workers
        self.conn = None
        self.cursor = None

        self.stats = {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "failed": 0,
            "kind_prestataire": 0,
            "kind_gestionnaire": 0,
            "kind_both": 0,
            "kind_none": 0,
        }

        # Setup requests session
        self.session = requests.Session()
        self.session.headers.update(
            {"Accept": "application/json", "Content-Type": "application/json"}
        )

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            logging.info("✅ Database connection established")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise

    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        if self.session:
            self.session.close()

    def get_users_to_sync(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get users from local database that need syncing.

        Args:
            limit: Optional limit on number of users to process

        Returns:
            List of user records with email addresses
        """
        query = """
        SELECT id, email
        FROM users
        WHERE email IS NOT NULL
        ORDER BY id
        """

        if limit:
            query += f" LIMIT {limit}"

        self.cursor.execute(query)
        users = self.cursor.fetchall()
        logging.info(f"📋 Found {len(users):,} users to sync")
        return users

    def fetch_user_from_api(self, email: str) -> Optional[Dict]:
        """
        Fetch user data from Portail DF API.

        Args:
            email: User email address

        Returns:
            User data from API or None if not found/error
        """
        try:
            url = f"{self.api_url}/utilisateurs"
            params = {"email": email}

            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # API returns paginated results
            if data.get("count", 0) == 0:
                logging.debug(f"User not found in Portail DF: {email}")
                return None

            # Get first result (should be only one)
            results = data.get("results", [])
            if results:
                return results[0]

            return None

        except requests.exceptions.RequestException as e:
            logging.warning(f"API request failed for {email}: {e}")
            return None
        except Exception as e:
            logging.error(f"Error fetching user {email}: {e}")
            return None

    def determine_kind(self, exterieur: bool, gestionnaire: bool) -> str:
        """
        Determine user kind based on exterieur and gestionnaire flags.

        Args:
            exterieur: Whether user is external
            gestionnaire: Whether user is a manager

        Returns:
            Kind value according to mapping rules
        """
        if exterieur and not gestionnaire:
            return "prestataire"
        elif not exterieur and gestionnaire:
            return "gestionnaire"
        elif exterieur and gestionnaire:
            return "prestataire, gestionnaire"
        else:  # not exterieur and not gestionnaire
            return "aucun"

    def process_user(self, user: Dict) -> Optional[Dict]:
        """
        Process a single user: fetch from API and determine kind.

        Args:
            user: User record from local database

        Returns:
            Update data or None if no update needed
        """
        api_data = self.fetch_user_from_api(user["email"])

        if not api_data:
            self.stats["skipped"] += 1
            return None

        exterieur = api_data.get("exterieur", False)
        gestionnaire = api_data.get("gestionnaire", False)
        kind = self.determine_kind(exterieur, gestionnaire)

        # Update stats
        if kind == "prestataire":
            self.stats["kind_prestataire"] += 1
        elif kind == "gestionnaire":
            self.stats["kind_gestionnaire"] += 1
        elif kind == "prestataire, gestionnaire":
            self.stats["kind_both"] += 1
        else:
            self.stats["kind_none"] += 1

        return {"user_id": user["id"], "email": user["email"], "kind": kind}

    def _update_batch_worker(self, batch_data: tuple) -> tuple:
        """
        Worker to update a batch of users in parallel.

        Args:
            batch_data: Tuple of (batch_id, batch, db_url)

        Returns:
            Tuple of (batch_id, count, error)
        """
        batch_id, batch, db_url = batch_data

        conn = None
        try:
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Optimize for faster commits
            cursor.execute("SET synchronous_commit = off")

            # Prepare update data
            update_data = [(item["kind"], item["user_id"]) for item in batch]

            # Execute batch update
            execute_values(
                cursor,
                """
                UPDATE users AS u
                SET kind = data.kind
                FROM (VALUES %s) AS data(kind, user_id)
                WHERE u.id = data.user_id
                """,
                update_data,
                page_size=500,
            )

            # Independent commit per batch
            conn.commit()
            cursor.close()
            conn.close()

            return (batch_id, len(batch), None)

        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                    conn.close()
                except:
                    pass
            return (batch_id, 0, str(e))

    def update_database(self, updates: List[Dict]):
        """
        Update database with user kind values.

        Args:
            updates: List of update records
        """
        if not updates:
            print("✅ No updates to apply")
            return

        if self.dry_run:
            print(f"✅ Dry run: {len(updates):,} updates prepared")
            print("\nSample updates:")
            for update in updates[:5]:
                print(f"  {update['email']}: {update['kind']}")
            return

        print(f"\n💾 Updating {len(updates):,} users...")

        # Split into batches
        batches = []
        for i in range(0, len(updates), self.batch_size):
            batch = updates[i : i + self.batch_size]
            batches.append((i // self.batch_size, batch, self.db_url))

        # Process in parallel
        total_success = 0
        with tqdm(total=len(updates), desc="Saving", unit="users") as pbar:
            with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
                futures = {
                    executor.submit(self._update_batch_worker, batch_data): batch_data
                    for batch_data in batches
                }

                for future in as_completed(futures):
                    batch_id, count, error = future.result()
                    if error:
                        logging.error(f"Batch {batch_id} error: {error}")
                        self.stats["failed"] += count if count > 0 else len(
                            batches[batch_id][1]
                        )
                    else:
                        total_success += count
                        self.stats["updated"] += count

                    pbar.update(count if count > 0 else len(batches[batch_id][1]))

        print(f"✅ Updated {total_success:,} users")

    def run(self, limit: Optional[int] = None):
        """
        Main execution method.

        Args:
            limit: Optional limit on number of users to process
        """
        print("=" * 80)
        print("USER KIND SYNCHRONIZATION")
        print("=" * 80)
        print(f"API URL: {self.api_url}")
        print(f"Dry run: {self.dry_run}")
        if limit:
            print(f"Limit: {limit:,} users")
        print()

        self.connect()

        try:
            # Get users to process
            users = self.get_users_to_sync(limit)

            if not users:
                print("✅ No users to process")
                return

            # Process users and fetch kind from API
            updates = []
            print(f"\n🔄 Fetching data from Portail DF API...")

            with tqdm(users, desc="Processing", unit="users") as pbar:
                for user in pbar:
                    try:
                        update = self.process_user(user)
                        if update:
                            updates.append(update)

                        self.stats["processed"] += 1

                        # Update progress bar with stats
                        pbar.set_postfix(
                            {
                                "updated": len(updates),
                                "skipped": self.stats["skipped"],
                            }
                        )

                    except Exception as e:
                        logging.error(f"Error processing user {user['email']}: {e}")
                        self.stats["failed"] += 1
                        continue

            # Update database
            if updates:
                self.update_database(updates)

            # Print summary
            print("\n" + "=" * 80)
            print("SUMMARY")
            print("=" * 80)
            print(f"Total processed: {self.stats['processed']:,}")
            print(f"Updated: {self.stats['updated']:,}")
            print(f"Skipped (not in API): {self.stats['skipped']:,}")
            print(f"Failed: {self.stats['failed']:,}")
            print()
            print("Kind distribution:")
            print(f"  Prestataire: {self.stats['kind_prestataire']:,}")
            print(f"  Gestionnaire: {self.stats['kind_gestionnaire']:,}")
            print(f"  Both: {self.stats['kind_both']:,}")
            print(f"  None: {self.stats['kind_none']:,}")
            print("=" * 80)

        finally:
            self.disconnect()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Synchronize user kind from Portail DF API"
    )

    parser.add_argument(
        "--db-url",
        required=True,
        help="PostgreSQL connection URI (postgresql://user:pass@host:port/dbname)",
    )
    parser.add_argument(
        "--api-url",
        required=True,
        help="Portail DF API base URL (e.g., https://portaildf.cerema.fr/api)",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Simulation mode (no database changes)"
    )
    parser.add_argument(
        "--limit", type=int, help="Limit number of users to process (for testing)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Batch size for database updates (default: 1000)",
    )
    parser.add_argument(
        "--num-workers",
        type=int,
        default=4,
        help="Number of parallel workers for DB updates (default: 4)",
    )
    parser.add_argument(
        "--debug", action="store_true", help="Enable debug logging"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Verbose output"
    )

    args = parser.parse_args()

    # Setup logging
    log_level = logging.DEBUG if args.debug else (
        logging.INFO if args.verbose else logging.WARNING
    )
    logging.basicConfig(
        level=log_level,
        format="%(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(
                f"sync_user_kind_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
            ),
            logging.StreamHandler(),
        ],
    )

    # Run synchronization
    sync = UserKindSync(
        db_url=args.db_url,
        api_url=args.api_url,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
    )

    try:
        sync.run(args.limit)
        print("\n✅ Synchronization completed successfully")
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        if args.debug:
            import traceback

            traceback.print_exc()


if __name__ == "__main__":
    main()
