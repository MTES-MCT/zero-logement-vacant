#!/usr/bin/env python3
"""
Compare two `localities_backup.jsonl` dumps ("before" / "after") and generate a
**CSV diff report**.

Each line of the JSON-Lines dumps has at least:
    {"id": "<uuid>", "localities_geo_code": ["...", ...] | null}

The script categorises every establishment as:
    • **unchanged**  – identical arrays (order-insensitive)
    • **added**      – appears only in *after*
    • **removed**    – appears only in *before*
    • **modified**   – exists in both but arrays differ (set diff)

For modified rows the report lists which geo-codes were *added* and which were
*removed*.

Output: a CSV with the following columns:
    id,status,before_len,after_len,added_codes,removed_codes

Example
-------
```bash
python diff_localities.py \
       --before localities_backup_before.jsonl \
       --after  localities_backup_after.jsonl \
       --output diff_localities.csv
```

Dependencies: none beyond the standard library (argparse, json, csv).
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Iterable, List, Mapping, MutableMapping, Sequence, Set

Array = Sequence[str] | None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_dump(path: Path) -> dict[str, Set[str] | None]:
    """Return a mapping id → set(localities) or None (if NULL in DB)."""

    mapping: dict[str, Set[str] | None] = {}
    with path.open("r", encoding="utf-8") as fp:
        for line in fp:
            row = json.loads(line)
            values = row.get("localities_geo_code")
            if values is None:
                mapping[row["id"]] = None
            else:
                mapping[row["id"]] = set(values)
    return mapping


def compare(before: Mapping[str, Set[str] | None], after: Mapping[str, Set[str] | None]):
    """Yield diff rows suitable for CSV writing."""

    all_ids = set(before) | set(after)
    for uid in sorted(all_ids):  # deterministic order
        b = before.get(uid)
        a = after.get(uid)

        if uid not in before:
            yield {
                "id": uid,
                "status": "added",
                "before_len": 0,
                "after_len": len(a) if a is not None else 0,
                "added_codes": ";".join(sorted(a)) if a else "",
                "removed_codes": "",
            }
        elif uid not in after:
            yield {
                "id": uid,
                "status": "removed",
                "before_len": len(b) if b is not None else 0,
                "after_len": 0,
                "added_codes": "",
                "removed_codes": ";".join(sorted(b)) if b else "",
            }
        else:
            # Present in both
            if b == a:
                yield {
                    "id": uid,
                    "status": "unchanged",
                    "before_len": len(b) if b is not None else 0,
                    "after_len": len(a) if a is not None else 0,
                    "added_codes": "",
                    "removed_codes": "",
                }
            else:
                added = sorted(a - b) if a is not None and b is not None else sorted(a or [])
                removed = sorted(b - a) if a is not None and b is not None else sorted(b or [])
                yield {
                    "id": uid,
                    "status": "modified",
                    "before_len": len(b) if b is not None else 0,
                    "after_len": len(a) if a is not None else 0,
                    "added_codes": ";".join(added),
                    "removed_codes": ";".join(removed),
                }

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def make_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Generate a CSV diff between two localities_backup.jsonl dumps."
    )
    p.add_argument("--before", required=True, type=Path, help="Path to BEFORE dump (JSONL)")
    p.add_argument("--after", required=True, type=Path, help="Path to AFTER dump (JSONL)")
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("diff_localities.csv"),
        help="Output CSV file (default: diff_localities.csv)",
    )
    return p


def main(argv: list[str] | None = None) -> None:  # pragma: no cover
    args = make_parser().parse_args(argv)

    before_map = load_dump(args.before)
    after_map = load_dump(args.after)

    rows = list(compare(before_map, after_map))

    # Write CSV
    with args.output.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(
            fp,
            fieldnames=[
                "id",
                "status",
                "before_len",
                "after_len",
                "added_codes",
                "removed_codes",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Diff written → {args.output} (rows: {len(rows)})")


if __name__ == "__main__":
    main()
