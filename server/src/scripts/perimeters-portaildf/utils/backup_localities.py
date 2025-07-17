#!/usr/bin/env python3
"""
Backup & restore *localities_geo_code* (text[]) from the `establishments` table.

This version is back to **argparse** for the CLI, with the connection string
provided via an **optional flag** `-c/--conn`.  If omitted, a local default
connection is used.

The primary change compared to earlier revisions is correct handling of the
`id` column, which is a **UUID**.  The dump query casts it to text so that the
resulting JSON‑Lines file is fully serialisable; when restoring, PostgreSQL
will implicitly cast the string back to UUID.

Quick usage
-----------
```bash
# Dump with the default connection
python backup_localities.py dump

# Dump with an explicit connection string
python backup_localities.py dump --conn "postgresql://user:pass@host:5432/db"

# Restore (only NULL targets) from the default dump file
python backup_localities.py restore

# Restore and overwrite existing values
python backup_localities.py restore --override
```

Requirements
------------
```bash
pip install psycopg[binary]
```
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_CONN = "dbname=isoprod user=postgres password=postgres host=localhost"
DEFAULT_DUMP = Path("localities_backup.jsonl")

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def dump_rows(conn_str: str, outfile: Path) -> None:
    """Dump each row's *id* (UUID cast to text) and *localities_geo_code*."""

    query = """
        SELECT id::text AS id, localities_geo_code
        FROM establishments
        WHERE localities_geo_code IS NOT NULL
        ORDER BY id
    """

    with psycopg.connect(conn_str, row_factory=dict_row) as conn, conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    outfile.parent.mkdir(parents=True, exist_ok=True)
    with outfile.open("w", encoding="utf-8") as fp:
        # A single object per line → easy streaming & diff‑friendly.
        for row in rows:
            json.dump(row, fp, ensure_ascii=False)
            fp.write("\n")

    print(f"Dumped {len(rows)} rows → {outfile}")


def restore_rows(conn_str: str, infile: Path, override: bool) -> None:
    """Restore *localities_geo_code* values from *infile* into the database."""

    with infile.open("r", encoding="utf-8") as fp:
        rows = [json.loads(line) for line in fp]

    # Build the parameterised query once.
    base_sql = """
        UPDATE establishments
        SET localities_geo_code = %(localities_geo_code)s
        WHERE id = %(id)s::uuid
    """
    sql = base_sql if override else base_sql + " AND localities_geo_code IS NULL"

    with psycopg.connect(conn_str) as conn, conn.cursor() as cur:
        for row in rows:
            cur.execute(sql, row)
        conn.commit()

    print(f"Restored {len(rows)} rows from {infile}")

# ---------------------------------------------------------------------------
# CLI (argparse)
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=(
            "Dump and restore the 'localities_geo_code' column from the "
            "'establishments' table.  If --conn is omitted, connects to a "
            "local PostgreSQL instance."
        )
    )

    p.add_argument("action", choices=["dump", "restore"], help="dump → file, restore ← file")

    p.add_argument(
        "-c",
        "--conn",
        default=DEFAULT_CONN,
        help=f"PostgreSQL DSN/URI (default: '{DEFAULT_CONN}')",
    )

    p.add_argument(
        "-f",
        "--file",
        type=Path,
        default=DEFAULT_DUMP,
        help=f"Dump file path (default: {DEFAULT_DUMP})",
    )

    p.add_argument(
        "--override",
        action="store_true",
        help="When restoring, overwrite existing non‑NULL values as well.",
    )

    return p


def main(argv: list[str] | None = None) -> None:  # pragma: no cover
    args = build_parser().parse_args(argv)

    try:
        if args.action == "dump":
            dump_rows(args.conn, args.file)
        else:
            restore_rows(args.conn, args.file, args.override)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
