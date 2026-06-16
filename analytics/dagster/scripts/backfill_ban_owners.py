"""One-shot BAN backfill for owners — keyset paginated + parallel.

Why this exists
---------------
`ban_daily_sync` is built for the steady-state daily diff: a 200k/day cap and a
candidate query whose TTL/score `OR` branches force a full LEFT JOIN scan every
batch. That is the wrong tool for a cold backfill of millions of never-geocoded
owners (~300 days at the daily cap).

This script:
  - Scopes candidates by one of two modes (``--by``):
      * ``owner-cohort`` (default) — owners whose ``owners.data_source`` matches
        ``--data-source`` (e.g. ``lovac-2026``). Original behaviour.
      * ``housing-lovac`` — owners linked to at least one housing whose
        ``fast_housing.data_file_years`` contains ``--data-source``, regardless
        of the owner's own ``data_source``. Catches owners imported in an older
        cohort (e.g. ``lovac-2025``) who own a ``lovac-2026`` housing. The
        predicate uses an EXISTS semi-join so keyset pagination on ``o.id`` stays
        correct (no fan-out from one-to-many joins).
  - Uses **keyset pagination** (``WHERE o.id > :last_id``) instead of re-scanning
    from the start each batch — O(N) over the cohort, not O(N²).
  - Geocodes chunks in **parallel** against the public BAN API.
  - Is **resumable**: the cursor (last processed owner id) is persisted to disk,
    so Ctrl-C / crash / re-run picks up where it stopped.

Cursor files are isolated per mode + data-source:
    .backfill_ban_owners.{by}.{data_source}.cursor.json
so the two modes never clobber each other's resume position.

It reuses the *exact* BAN client and upsert helpers as the Dagster asset
(loaded directly from ``src/assets/ban/``), so the written rows are identical:
same schema, same ``ON CONFLICT (ref_id, address_kind)`` merge, same not-found
sentinel. It does NOT import the dagster package, so it runs without a full
dagster/env bootstrap.

Usage
-----
From ``analytics/dagster/`` with the same Postgres + BAN env as Dagster:

    export $(grep -v '^#' .env | xargs)   # or however you load env
    uv run python scripts/backfill_ban_owners.py --count          # how many left
    uv run python scripts/backfill_ban_owners.py                  # run it
    uv run python scripts/backfill_ban_owners.py --workers 12 --chunk 500
    uv run python scripts/backfill_ban_owners.py --data-source lovac-2025
    uv run python scripts/backfill_ban_owners.py --limit 50000    # stop after N
    uv run python scripts/backfill_ban_owners.py --reset          # ignore cursor

    # housing-lovac mode: geocode owners linked to any lovac-2026 housing,
    # regardless of the owner's own data_source
    uv run python scripts/backfill_ban_owners.py --by housing-lovac
    uv run python scripts/backfill_ban_owners.py --by housing-lovac --data-source lovac-2026 --count

Required env: POSTGRES_PRODUCTION_DB, POSTGRES_PRODUCTION_PORT,
POSTGRES_PRODUCTION_DB_NAME, POSTGRES_PRODUCTION_WRITE_ACCESS_USER,
POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD, BAN_API_URL.

Tune --workers conservatively: the public BAN API rate-limits per IP. If you see
429/503, lower --workers. For tens of millions, prefer a self-hosted addok.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import logging
import os
import signal
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pandas as pd
import psycopg2

LOG = logging.getLogger("backfill_ban_owners")

# --- Load the leaf BAN helpers straight from src/, bypassing src/__init__.py
# (which eagerly imports the whole dagster Definitions and needs a full env).
_SRC = Path(__file__).resolve().parent.parent / "src" / "assets" / "ban"


def _load(mod_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(mod_name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_client = _load("_ban_client", _SRC / "_client.py")
_upsert = _load("_ban_upsert", _SRC / "_upsert.py")

call_ban_api = _client.call_ban_api
BanApiFatalError = _client.BanApiFatalError
create_temp_table = _upsert.create_temp_table
prepare_valid = _upsert.prepare_valid
prepare_not_found = _upsert.prepare_not_found
copy_upsert = _upsert.copy_upsert

# ---------------------------------------------------------------------------
# owner-cohort mode (default)
# Keyset-paginated, cohort-scoped, never-geocoded-only.
# No TTL/score OR branches: a cold backfill only cares about missing rows, and
# dropping them lets Postgres use the owners.id PK + (ref_id) anti-join path.
# ---------------------------------------------------------------------------
OWNER_COHORT_CANDIDATES_SQL = """
SELECT o.id AS ref_id,
       array_to_string(o.address_dgfip, ' ') AS address_dgfip
FROM owners o
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL
  AND o.data_source = %(data_source)s
  AND o.id > %(last_id)s
ORDER BY o.id
LIMIT %(limit)s;
"""

OWNER_COHORT_REMAINING_SQL = """
SELECT COUNT(*)
FROM owners o
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL
  AND o.data_source = %(data_source)s;
"""

# ---------------------------------------------------------------------------
# housing-lovac mode
# Geocodes owners linked to at least one housing whose data_file_years contains
# the target cohort tag, regardless of the owner's own data_source.
# Uses EXISTS (semi-join) so there is no fan-out from the one-to-many
# owners_housing relation — keyset pagination on o.id stays correct.
# The fast_housing join uses both fh.id and fh.geo_code to hit the composite PK
# and benefit from partition pruning on the RANGE-partitioned table.
# ---------------------------------------------------------------------------
HOUSING_LOVAC_CANDIDATES_SQL = """
SELECT o.id AS ref_id,
       array_to_string(o.address_dgfip, ' ') AS address_dgfip
FROM owners o
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL
  AND o.id > %(last_id)s
  AND EXISTS (
    SELECT 1 FROM owners_housing oh
    JOIN fast_housing fh
      ON fh.id = oh.housing_id AND fh.geo_code = oh.housing_geo_code
    WHERE oh.owner_id = o.id
      AND %(data_source)s = ANY(fh.data_file_years)
  )
ORDER BY o.id
LIMIT %(limit)s;
"""

HOUSING_LOVAC_REMAINING_SQL = """
SELECT COUNT(*)
FROM owners o
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL
  AND EXISTS (
    SELECT 1 FROM owners_housing oh
    JOIN fast_housing fh
      ON fh.id = oh.housing_id AND fh.geo_code = oh.housing_geo_code
    WHERE oh.owner_id = o.id
      AND %(data_source)s = ANY(fh.data_file_years)
  );
"""

# Map mode name -> (candidates_sql, remaining_sql)
_SQL_BY_MODE: dict[str, tuple[str, str]] = {
    "owner-cohort": (OWNER_COHORT_CANDIDATES_SQL, OWNER_COHORT_REMAINING_SQL),
    "housing-lovac": (HOUSING_LOVAC_CANDIDATES_SQL, HOUSING_LOVAC_REMAINING_SQL),
}

ZERO_UUID = "00000000-0000-0000-0000-000000000000"


def _require_env(*names: str) -> None:
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        sys.exit(f"Missing required env: {', '.join(missing)}")


def connect():
    return psycopg2.connect(
        dbname=os.environ["POSTGRES_PRODUCTION_DB_NAME"],
        user=os.environ["POSTGRES_PRODUCTION_WRITE_ACCESS_USER"],
        password=os.environ["POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD"],
        host=os.environ["POSTGRES_PRODUCTION_DB"],
        port=os.environ["POSTGRES_PRODUCTION_PORT"],
        # Clever Cloud Postgres: libpq default "prefer" works; override with
        # POSTGRES_SSLMODE=require if the addon enforces TLS.
        sslmode=os.environ.get("POSTGRES_SSLMODE", "prefer"),
    )


def cursor_file(by: str, data_source: str) -> Path:
    return Path(f".backfill_ban_owners.{by}.{data_source}.cursor.json")


def load_cursor(by: str, data_source: str) -> str:
    f = cursor_file(by, data_source)
    if f.exists():
        last_id = json.loads(f.read_text())["last_id"]
        LOG.info("Resuming from cursor %s (%s)", last_id, f)
        return last_id
    return ZERO_UUID


def save_cursor(by: str, data_source: str, last_id: str) -> None:
    cursor_file(by, data_source).write_text(json.dumps({"last_id": last_id}))


def remaining(conn, remaining_sql: str, data_source: str) -> int:
    with conn.cursor() as cur:
        cur.execute(remaining_sql, {"data_source": data_source})
        return cur.fetchone()[0]


def fetch_batch(conn, candidates_sql: str, data_source: str, last_id: str, limit: int) -> pd.DataFrame:
    return pd.read_sql_query(
        candidates_sql,
        conn,
        params={"data_source": data_source, "last_id": last_id, "limit": limit},
    )


def geocode_parallel(df: pd.DataFrame, chunk: int, workers: int, api_url: str) -> pd.DataFrame:
    """Split df into `chunk`-sized slices, geocode them concurrently, concat."""
    slices = [df.iloc[i : i + chunk] for i in range(0, len(df), chunk)]
    results: list[pd.DataFrame] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(call_ban_api, s, api_url): i for i, s in enumerate(slices)}
        for fut in as_completed(futures):
            i = futures[fut]
            try:
                results.append(fut.result())
            except BanApiFatalError:
                raise  # 4xx config error — abort, retrying won't help
            except Exception as e:  # noqa: BLE001 — transient slice, log + skip
                LOG.error("slice %d failed after retries: %s — skipped", i, e)
    return pd.concat(results, ignore_index=True) if results else pd.DataFrame()


def run(args: argparse.Namespace) -> None:
    ds = args.data_source
    by = args.by
    candidates_sql, remaining_sql = _SQL_BY_MODE[by]

    api_url = os.environ["BAN_API_URL"]
    conn = connect()
    conn.autocommit = False

    total_left = remaining(conn, remaining_sql, ds)
    LOG.info("Mode %s / cohort %s — %d owners missing a BAN address", by, ds, total_left)
    if args.count:
        print(total_left)
        return
    if total_left == 0:
        LOG.info("Nothing to do.")
        return

    last_id = ZERO_UUID if args.reset else load_cursor(by, ds)
    processed = ok = nf = 0
    stop = {"flag": False}

    def _handle(signum, frame):  # graceful Ctrl-C: stop after current batch
        LOG.warning("Signal %s — stopping after current batch.", signum)
        stop["flag"] = True

    signal.signal(signal.SIGINT, _handle)
    signal.signal(signal.SIGTERM, _handle)

    with conn.cursor() as write_cur:
        create_temp_table(write_cur)
        conn.commit()

        while not stop["flag"]:
            if args.limit and processed >= args.limit:
                LOG.info("Reached --limit %d — stopping.", args.limit)
                break

            df = fetch_batch(conn, candidates_sql, ds, last_id, args.fetch_batch)
            if df.empty:
                LOG.info("No more candidates — mode %s / cohort %s fully geocoded.", by, ds)
                break

            api = geocode_parallel(df, args.chunk, args.workers, api_url)
            if not api.empty:
                ok += copy_upsert(write_cur, prepare_valid(api, "Owner"))
                nf += copy_upsert(write_cur, prepare_not_found(api, "Owner"))
                conn.commit()

            last_id = str(df["ref_id"].iloc[-1])
            save_cursor(by, ds, last_id)
            processed += len(df)
            LOG.info(
                "batch: in=%d ok_total=%d nf_total=%d processed=%d/%d cursor=%s",
                len(df), ok, nf, processed, total_left, last_id,
            )

    LOG.info("Done. processed=%d ok=%d not_found=%d", processed, ok, nf)
    conn.close()


def main() -> None:
    p = argparse.ArgumentParser(
        description="One-shot parallel BAN backfill for owners (keyset paginated)."
    )
    p.add_argument(
        "--by",
        choices=["owner-cohort", "housing-lovac"],
        default="owner-cohort",
        help=(
            "Candidate selection mode. "
            "'owner-cohort' (default): owners whose data_source matches --data-source. "
            "'housing-lovac': owners linked to a housing whose data_file_years contains "
            "--data-source, regardless of the owner's own data_source."
        ),
    )
    p.add_argument(
        "--data-source",
        default="lovac-2026",
        help=(
            "Cohort tag used as filter value. "
            "In owner-cohort mode: matched against owners.data_source. "
            "In housing-lovac mode: matched against fast_housing.data_file_years elements."
        ),
    )
    p.add_argument("--fetch-batch", type=int, default=20_000, help="rows fetched per DB page")
    p.add_argument("--chunk", type=int, default=500, help="addresses per BAN API request")
    p.add_argument("--workers", type=int, default=8, help="concurrent BAN requests")
    p.add_argument("--limit", type=int, default=0, help="stop after N owners (0 = all)")
    p.add_argument("--count", action="store_true", help="print remaining count and exit")
    p.add_argument("--reset", action="store_true", help="ignore saved cursor, start over")
    args = p.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        stream=sys.stdout,
    )
    _require_env(
        "POSTGRES_PRODUCTION_DB",
        "POSTGRES_PRODUCTION_PORT",
        "POSTGRES_PRODUCTION_DB_NAME",
        "POSTGRES_PRODUCTION_WRITE_ACCESS_USER",
        "POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD",
        "BAN_API_URL",
    )
    run(args)


if __name__ == "__main__":
    main()
