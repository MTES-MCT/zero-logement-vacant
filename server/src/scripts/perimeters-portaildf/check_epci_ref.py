#!/usr/bin/env python3
"""
EPCI consistency check:
    • reads the JSON Lines file (Cerema perimeters)
    • validates SIREN (format + Luhn algorithm)
    • compares with the official EPCI reference (CSV)

Reference is located at: https://www.collectivites-locales.gouv.fr/institutions/liste-et-composition-des-epci-fiscalite-propre

Usage:
        python check_epci_ref.py perimetres.jsonl referentiel_epci.csv
"""

from __future__ import annotations
import csv
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

SIREN_RE = re.compile(r"^\d{9}$")


# ────────────────────────────────────────────────────────────────
# SIREN validation (Luhn algorithm)
# ────────────────────────────────────────────────────────────────
def luhn_ok(number: str) -> bool:
    total = 0
    for pos, char in enumerate(reversed(number)):
        n = int(char)
        if pos % 2:            # odd positions (starting from 0)
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


# ────────────────────────────────────────────────────────────────
# Read the reference CSV
# ────────────────────────────────────────────────────────────────
def load_epci_reference(csv_path: Path) -> Dict[str, dict]:
    """
    Returns a mapping {siren: csv_row_as_dict}
    """
    ref: Dict[str, dict] = {}
    with csv_path.open(encoding="utf-8") as fh:
        reader = csv.DictReader(fh, delimiter=";")
        for row in reader:
            siren = row["siren_epci"].strip()
            if SIREN_RE.match(siren) and luhn_ok(siren):
                ref[siren] = row
            else:
                print(
                    f"⚠️  Invalid SIREN in reference: {siren} "
                    f"(line {reader.line_num})",
                    file=sys.stderr,
                )
    return ref


# ────────────────────────────────────────────────────────────────
# Read the Cerema JSONL
# ────────────────────────────────────────────────────────────────
def load_siren_from_jsonl(jsonl_path: Path) -> Tuple[Set[str], List[str]]:
    """
    Parses the JSON Lines and returns
      • the set of valid EPCI SIREN codes
      • the list of detected anomalies
    """
    sirens: Set[str] = set()
    issues: List[str] = []

    with jsonl_path.open(encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            obj = json.loads(line)
            epci = obj.get("epci", [])
            if not epci:          # not an EPCI perimeter
                continue

            if len(epci) != 1:
                issues.append(
                    f"Line {lineno}: {len(epci)} EPCI codes (1 expected)"
                )
                continue

            siren = str(epci[0]).strip()
            if not SIREN_RE.match(siren):
                issues.append(f"Line {lineno}: invalid SIREN format ({siren})")
            elif not luhn_ok(siren):
                issues.append(f"Line {lineno}: invalid Luhn key ({siren})")
            else:
                sirens.add(siren)

    return sirens, issues

def main(jsonl_file: str, ref_csv: str) -> None:
    jsonl_path = Path(jsonl_file)
    ref_path = Path(ref_csv)

    if not jsonl_path.exists():
        sys.exit(f"JSON file not found: {jsonl_path}")
    if not ref_path.exists():
        sys.exit(f"CSV file not found: {ref_path}")

    # 1) Reference
    ref = load_epci_reference(ref_path)
    print(f"Reference: {len(ref):,} valid EPCI loaded")

    # 2) JSON Lines
    epci_sirens, issues = load_siren_from_jsonl(jsonl_path)
    print(f"EPCI perimeters in JSON: {len(epci_sirens):,}")

    if issues:
        print("\nErrors detected in JSON:")
        for msg in issues:
            print(" •", msg)

    # 3) Comparison
    missing = set(ref) - epci_sirens
    unexpected = epci_sirens - set(ref)

    print("\n--- Comparison results ---")
    print(f"✓ Common EPCI (OK)      : {len(epci_sirens & set(ref)):,}")
    print(f"✗ Missing EPCI (JSON)   : {len(missing):,}")
    print(f"✗ Unexpected EPCI (JSON): {len(unexpected):,}")

    # 4) Details (limited to the first 20 for display)
    if missing:
        print("\n*Missing* EPCI (in reference but not in JSON) – first 20:")
        for siren in list(missing)[:20]:
            print(f"  {siren}  –  {ref[siren]['nom_complet']}")

    if unexpected:
        print("\n*Unexpected* EPCI (in JSON but not in reference) – first 20:")
        for siren in list(unexpected)[:20]:
            print(f"  {siren}")

    # 5) Detailed CSV export of missing (optional)
    if missing:
        out_path = Path("epci_missing.csv")
        with out_path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "siren_epci",
                    "nom_complet",
                    "dep_epci",
                    "nb_com_2025",
                ],
                delimiter=";",
            )
            writer.writeheader()
            for siren in sorted(missing):
                row = ref[siren]
                writer.writerow(
                    {
                        "siren_epci": siren,
                        "nom_complet": row["nom_complet"],
                        "dep_epci": row["dep_epci"],
                        "nb_com_2025": row["nb_com_2025"],
                    }
                )
        print(f"\nDetailed list exported to {out_path.resolve()}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python check_epci_ref.py perimetres.jsonl referentiel_epci.csv"
        )
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
