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

Cursor files are isolated per mode, data-source, and optional housing scope, so
annual, establishment, and commune runs never share a resume position.

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
    # regardless of the owner's own data_source. First run builds a persistent
    # ban_backfill_targets_<tag> table (one heavy join), then paginates it.
    uv run python scripts/backfill_ban_owners.py --by housing-lovac
    uv run python scripts/backfill_ban_owners.py --by housing-lovac --data-source lovac-2026
    uv run python scripts/backfill_ban_owners.py --by housing-lovac --geo-code 38200
    uv run python scripts/backfill_ban_owners.py --by housing-lovac --establishment-id <uuid>
    uv run python scripts/backfill_ban_owners.py --by housing-lovac --rebuild-targets  # after a new import

Required env: POSTGRES_PRODUCTION_DB, POSTGRES_PRODUCTION_PORT,
POSTGRES_PRODUCTION_DB_NAME, POSTGRES_PRODUCTION_WRITE_ACCESS_USER,
POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD, BAN_API_URL.

Tune --workers conservatively: the public BAN API rate-limits per IP. If you see
429/503, lower --workers. For tens of millions, prefer a self-hosted addok.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import logging
import os
import re
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
#
# A live EXISTS / JOIN does NOT work here: the owner<-housing link is "all of
# owners_housing (~6.6M rows) hash-joined to a 96-partition seq scan of
# fast_housing". The planner materialises that whole semi-join *before* applying
# ORDER BY id / LIMIT, so keyset pagination buys nothing — every batch redoes the
# full join and exceeds the Postgres duration cap (connection dies, SSL EOF).
#
# So we pay that join ONCE into a persistent table of distinct owner ids
# (`ban_backfill_targets_<tag>`), add a PK, then every batch is a cheap keyset
# index scan over that small table joined back to owners. The table is persistent
# (not TEMP) because each run opens a fresh connection and must resume against the
# same set. ensure_targets() builds it automatically on first run.
# ---------------------------------------------------------------------------

# Built once (see ensure_targets). {table} is a validated identifier; the cohort
# tag is bound as %(data_source)s.
HOUSING_LOVAC_BUILD_SQL = """
DROP TABLE IF EXISTS {table};
CREATE TABLE {table} AS
SELECT DISTINCT oh.owner_id AS id
FROM owners_housing oh
JOIN fast_housing fh
  ON fh.id = oh.housing_id AND fh.geo_code = oh.housing_geo_code
WHERE %(data_source)s = ANY(fh.data_file_years)
{scope_sql};
ALTER TABLE {table} ADD PRIMARY KEY (id);
"""

# Per-batch: keyset over the small targets table, anti-joined to ban_addresses
# so already-geocoded owners drop out and the run is resumable/idempotent.
HOUSING_LOVAC_CANDIDATES_SQL = """
SELECT o.id AS ref_id,
       array_to_string(o.address_dgfip, ' ') AS address_dgfip
FROM {table} t
JOIN owners o ON o.id = t.id
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL
  AND t.id > %(last_id)s
ORDER BY t.id
LIMIT %(limit)s;
"""

HOUSING_LOVAC_REMAINING_SQL = """
SELECT COUNT(*)
FROM {table} t
JOIN owners o ON o.id = t.id
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL;
"""


def _scope_suffix(
    establishment_id: str | None = None, geo_codes: tuple[str, ...] = ()
) -> str:
    normalized_geo_codes = sorted(set(geo_codes))
    if not establishment_id and not normalized_geo_codes:
        return ""
    payload = json.dumps(
        {
            "establishment_id": establishment_id,
            "geo_codes": normalized_geo_codes,
        },
        sort_keys=True,
    )
    return "_" + hashlib.sha256(payload.encode()).hexdigest()[:12]


def _targets_table(
    data_source: str,
    establishment_id: str | None = None,
    geo_codes: tuple[str, ...] = (),
) -> str:
    """Persistent targets-table name for a cohort tag, e.g.
    lovac-2026 -> ban_backfill_targets_lovac_2026. Validates the tag so it is safe
    to inline as an SQL identifier (table names cannot be bind params)."""
    if not re.fullmatch(r"[a-z0-9-]+", data_source):
        sys.exit(f"Refusing unsafe data-source identifier: {data_source!r}")
    return (
        "ban_backfill_targets_"
        + data_source.replace("-", "_")
        + _scope_suffix(establishment_id, geo_codes)
    )


def housing_lovac_build_query(
    data_source: str,
    establishment_id: str | None = None,
    geo_codes: tuple[str, ...] = (),
) -> tuple[str, dict]:
    table = _targets_table(data_source, establishment_id, geo_codes)
    clauses: list[str] = []
    params: dict = {"data_source": data_source}
    if establishment_id:
        clauses.append("""
  AND fh.geo_code = ANY(
    COALESCE(
      (
        SELECT localities_geo_code
        FROM establishments
        WHERE id = %(establishment_id)s::uuid
      ),
      ARRAY[]::text[]
    )
  )
            """.rstrip())
        params["establishment_id"] = establishment_id
    if geo_codes:
        clauses.append("  AND fh.geo_code = ANY(%(geo_codes)s::text[])")
        params["geo_codes"] = list(geo_codes)
    scope_sql = "\n".join(clauses)
    return HOUSING_LOVAC_BUILD_SQL.format(table=table, scope_sql=scope_sql), params


# ---------------------------------------------------------------------------
# all-owners mode
# Every owner with an address and no BAN row yet — no cohort/housing filter.
# Pure keyset over the owners PK + (ref_id) anti-join: the lightest query of all.
# ---------------------------------------------------------------------------
ALL_OWNERS_CANDIDATES_SQL = """
SELECT o.id AS ref_id,
       array_to_string(o.address_dgfip, ' ') AS address_dgfip
FROM owners o
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL
  AND o.id > %(last_id)s
ORDER BY o.id
LIMIT %(limit)s;
"""

ALL_OWNERS_REMAINING_SQL = """
SELECT COUNT(*)
FROM owners o
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND ba.ref_id IS NULL;
"""


def _mode_sql(
    by: str,
    data_source: str,
    establishment_id: str | None = None,
    geo_codes: tuple[str, ...] = (),
) -> tuple[str, str]:
    """Return (candidates_sql, remaining_sql) for the selection mode."""
    if by == "owner-cohort":
        return OWNER_COHORT_CANDIDATES_SQL, OWNER_COHORT_REMAINING_SQL
    if by == "all-owners":
        return ALL_OWNERS_CANDIDATES_SQL, ALL_OWNERS_REMAINING_SQL
    table = _targets_table(data_source, establishment_id, geo_codes)
    return (
        HOUSING_LOVAC_CANDIDATES_SQL.format(table=table),
        HOUSING_LOVAC_REMAINING_SQL.format(table=table),
    )


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
        # Long EXISTS scans can sit silent long enough for a NAT/proxy to drop the
        # socket ("SSL SYSCALL error: EOF detected"). TCP keepalives keep it warm.
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )


def cursor_file(
    by: str,
    data_source: str,
    establishment_id: str | None = None,
    geo_codes: tuple[str, ...] = (),
) -> Path:
    suffix = _scope_suffix(establishment_id, geo_codes)
    return Path(f".backfill_ban_owners.{by}.{data_source}{suffix}.cursor.json")


def load_cursor(
    by: str,
    data_source: str,
    establishment_id: str | None = None,
    geo_codes: tuple[str, ...] = (),
) -> str:
    f = cursor_file(by, data_source, establishment_id, geo_codes)
    if f.exists():
        last_id = json.loads(f.read_text())["last_id"]
        LOG.info("Resuming from cursor %s (%s)", last_id, f)
        return last_id
    return ZERO_UUID


def save_cursor(
    by: str,
    data_source: str,
    last_id: str,
    establishment_id: str | None = None,
    geo_codes: tuple[str, ...] = (),
) -> None:
    cursor_file(by, data_source, establishment_id, geo_codes).write_text(
        json.dumps({"last_id": last_id})
    )


def remaining(conn, remaining_sql: str, data_source: str) -> int:
    with conn.cursor() as cur:
        cur.execute(remaining_sql, {"data_source": data_source})
        return cur.fetchone()[0]


def ensure_targets(
    conn,
    data_source: str,
    rebuild: bool,
    establishment_id: str | None = None,
    geo_codes: tuple[str, ...] = (),
) -> None:
    """housing-lovac mode: make sure the persistent targets table exists.

    Builds it once (the heavy owners_housing<->fast_housing join) with jit off and
    a fat work_mem so the hash doesn't spill. Subsequent runs reuse it. Pass
    rebuild=True to force a fresh build (e.g. after a new LOVAC import)."""
    table = _targets_table(data_source, establishment_id, geo_codes)
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s)", (table,))
        exists = cur.fetchone()[0] is not None

    if exists and not rebuild:
        with conn.cursor() as cur:
            cur.execute(f"SELECT count(*) FROM {table}")
            LOG.info("Targets table %s present — %d owners.", table, cur.fetchone()[0])
        return

    LOG.info("Building targets table %s (one-time heavy join)…", table)
    with conn.cursor() as cur:
        cur.execute("SET jit = off")
        cur.execute("SET work_mem = '512MB'")
        query, params = housing_lovac_build_query(
            data_source, establishment_id, geo_codes
        )
        cur.execute(query, params)
    conn.commit()
    with conn.cursor() as cur:
        cur.execute(f"SELECT count(*) FROM {table}")
        LOG.info("Built %s — %d target owners.", table, cur.fetchone()[0])


def fetch_batch(
    conn, candidates_sql: str, data_source: str, last_id: str, limit: int
) -> pd.DataFrame:
    return pd.read_sql_query(
        candidates_sql,
        conn,
        params={"data_source": data_source, "last_id": last_id, "limit": limit},
    )


def next_fetch_limit(fetch_batch: int, *, limit: int, processed: int) -> int:
    if limit <= 0:
        return fetch_batch
    return min(fetch_batch, max(limit - processed, 0))


def geocode_parallel(
    df: pd.DataFrame, chunk: int, workers: int, api_url: str
) -> pd.DataFrame:
    """Split df into `chunk`-sized slices, geocode them concurrently, concat."""
    slices = [df.iloc[i : i + chunk] for i in range(0, len(df), chunk)]
    results: list[pd.DataFrame] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(call_ban_api, s, api_url): i for i, s in enumerate(slices)
        }
        for fut in as_completed(futures):
            i = futures[fut]
            try:
                results.append(fut.result())
            except BanApiFatalError:
                raise  # 4xx config error — abort, retrying won't help
            except Exception as error:
                LOG.error(
                    "slice %d failed after retries: %s — aborting batch", i, error
                )
                raise
    return pd.concat(results, ignore_index=True) if results else pd.DataFrame()


def run(args: argparse.Namespace) -> None:
    ds = args.data_source
    by = args.by
    establishment_id = args.establishment_id or None
    geo_codes = tuple(args.geo_code or ())
    if by != "housing-lovac" and (establishment_id or geo_codes):
        raise ValueError(
            "--establishment-id/--geo-code are only supported with "
            "--by housing-lovac."
        )
    candidates_sql, remaining_sql = _mode_sql(by, ds, establishment_id, geo_codes)

    api_url = os.environ["BAN_API_URL"]
    conn = connect()
    conn.autocommit = False

    # housing-lovac reads from a precomputed targets table; build it if missing.
    if by == "housing-lovac":
        ensure_targets(
            conn,
            ds,
            rebuild=args.rebuild_targets,
            establishment_id=establishment_id,
            geo_codes=geo_codes,
        )

    # The remaining COUNT(*) now just counts the small targets table joined to
    # owners — cheap. Still only run it on demand to keep a plain run fast.
    total_left: int | None = None
    if args.count:
        total_left = remaining(conn, remaining_sql, ds)
        print(total_left)
        return

    last_id = (
        ZERO_UUID
        if args.reset or args.rebuild_targets
        else load_cursor(by, ds, establishment_id, geo_codes)
    )
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

            fetch_limit = next_fetch_limit(
                args.fetch_batch,
                limit=args.limit,
                processed=processed,
            )
            if fetch_limit <= 0:
                break
            df = fetch_batch(conn, candidates_sql, ds, last_id, fetch_limit)
            if df.empty:
                LOG.info(
                    "No more candidates — mode %s / cohort %s fully geocoded.", by, ds
                )
                break

            api = geocode_parallel(df, args.chunk, args.workers, api_url)
            if not api.empty:
                ok += copy_upsert(write_cur, prepare_valid(api, "Owner"))
                nf += copy_upsert(write_cur, prepare_not_found(api, "Owner"))
                conn.commit()

            last_id = str(df["ref_id"].iloc[-1])
            save_cursor(by, ds, last_id, establishment_id, geo_codes)
            processed += len(df)
            LOG.info(
                "batch: in=%d ok_total=%d nf_total=%d processed=%d/%s cursor=%s",
                len(df),
                ok,
                nf,
                processed,
                total_left if total_left is not None else "?",
                last_id,
            )

    LOG.info("Done. processed=%d ok=%d not_found=%d", processed, ok, nf)
    conn.close()


def main() -> None:
    p = argparse.ArgumentParser(
        description="One-shot parallel BAN backfill for owners (keyset paginated)."
    )
    p.add_argument(
        "--by",
        choices=["owner-cohort", "housing-lovac", "all-owners"],
        default="owner-cohort",
        help=(
            "Candidate selection mode. "
            "'owner-cohort' (default): owners whose data_source matches --data-source. "
            "'housing-lovac': owners linked to a housing whose data_file_years contains "
            "--data-source, regardless of the owner's own data_source. "
            "'all-owners': every owner missing a BAN address, no filter."
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
    p.add_argument(
        "--establishment-id",
        default="",
        help="housing-lovac: restrict targets to the establishment geo codes",
    )
    p.add_argument(
        "--geo-code",
        action="append",
        default=[],
        help="housing-lovac: restrict targets to an INSEE geo code; repeatable",
    )
    p.add_argument(
        "--fetch-batch", type=int, default=20_000, help="rows fetched per DB page"
    )
    p.add_argument(
        "--chunk", type=int, default=500, help="addresses per BAN API request"
    )
    p.add_argument("--workers", type=int, default=8, help="concurrent BAN requests")
    p.add_argument("--limit", type=int, default=0, help="stop after N owners (0 = all)")
    p.add_argument(
        "--count", action="store_true", help="print remaining count and exit"
    )
    p.add_argument(
        "--reset", action="store_true", help="ignore saved cursor, start over"
    )
    p.add_argument(
        "--rebuild-targets",
        action="store_true",
        help="housing-lovac: force a rebuild of the ban_backfill_targets_<tag> table",
    )
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
