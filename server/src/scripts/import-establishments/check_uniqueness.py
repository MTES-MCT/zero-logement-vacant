#!/usr/bin/env python3

"""
Script to check SIREN/SIRET uniqueness in CSV files

Usage:
    python3 server/src/scripts/import-establishments/check_uniqueness.py
"""

import csv
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple


def load_csv(file_path: str) -> List[Dict[str, str]]:
    """Load CSV file and return list of dictionaries"""
    # Increase field size limit for large fields (e.g., Geo_Perimeter)
    csv.field_size_limit(10 * 1024 * 1024)  # 10 MB

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def check_uniqueness():
    """Check SIREN/SIRET uniqueness in CSV files"""
    script_dir = Path(__file__).parent
    files = [
        {'path': script_dir / 'entities_processed.csv', 'name': 'entities'},
        {'path': script_dir / 'collectivities_processed.csv', 'name': 'collectivities'}
    ]

    print('=' * 80)
    print('SIREN/SIRET UNIQUENESS CHECK')
    print('=' * 80)
    print()

    # Maps to track duplicates
    siren_map: Dict[str, List[Dict]] = defaultdict(list)
    siret_map: Dict[str, List[Dict]] = defaultdict(list)
    pair_map: Dict[str, List[Dict]] = defaultdict(list)

    total_rows = 0
    empty_siren = 0
    empty_siret = 0
    invalid_siren = 0
    invalid_siret = 0

    # Load all data
    for file in files:
        print(f"📁 Loading {file['name']}: {file['path']}")

        if not file['path'].exists():
            print(f"   ❌ File not found: {file['path']}")
            continue

        rows = load_csv(str(file['path']))
        print(f"   ✅ Loaded {len(rows)} rows")
        total_rows += len(rows)

        # Process each row
        for row in rows:
            siren = row.get('Siren', '').strip()
            siret = row.get('Siret', '').strip()
            name = row.get('Name-zlv') or row.get('Name-source', '')
            kind = row.get('Kind-admin', '')

            # Check for empty values
            if not siren:
                empty_siren += 1
                print(f"   ⚠️  Empty SIREN for: {name}")
                continue

            if not siret:
                empty_siret += 1
                print(f"   ⚠️  Empty SIRET for: {name}")
                continue

            # Validate SIREN (9 digits)
            if not siren.isdigit() or len(siren) != 9:
                invalid_siren += 1
                print(f"   ⚠️  Invalid SIREN format ({siren}) for: {name}")

            # Validate SIRET (14 digits)
            if not siret.isdigit() or len(siret) != 14:
                invalid_siret += 1
                print(f"   ⚠️  Invalid SIRET format ({siret}) for: {name}")

            # Validate that SIRET starts with SIREN
            if not siret.startswith(siren):
                print(f"   ⚠️  SIRET ({siret}) doesn't start with SIREN ({siren}) for: {name}")

            # Track SIREN duplicates
            siren_map[siren].append({
                'name': name,
                'siret': siret,
                'kind': kind,
                'file': file['name']
            })

            # Track SIRET duplicates
            siret_map[siret].append({
                'name': name,
                'siren': siren,
                'kind': kind,
                'file': file['name']
            })

            # Track SIREN/SIRET pair duplicates
            pair_key = f"{siren}|{siret}"
            pair_map[pair_key].append({
                'name': name,
                'kind': kind,
                'file': file['name']
            })

        print()

    # Report summary
    print('=' * 80)
    print('SUMMARY')
    print('=' * 80)
    print(f"Total rows processed: {total_rows}")
    print(f"Empty SIREN: {empty_siren}")
    print(f"Empty SIRET: {empty_siret}")
    print(f"Invalid SIREN format: {invalid_siren}")
    print(f"Invalid SIRET format: {invalid_siret}")
    print()

    # Check SIREN uniqueness
    siren_duplicates = [(k, v) for k, v in siren_map.items() if len(v) > 1]
    siren_duplicates.sort(key=lambda x: len(x[1]), reverse=True)

    print('=' * 80)
    print('SIREN DUPLICATES')
    print('=' * 80)
    if not siren_duplicates:
        print('✅ All SIREN values are unique!')
    else:
        print(f"❌ Found {len(siren_duplicates)} duplicate SIREN values\n")

        for siren, entries in siren_duplicates[:10]:
            print(f"SIREN: {siren} ({len(entries)} occurrences)")
            for entry in entries:
                print(f"  - {entry['name']} ({entry['kind']}, SIRET: {entry['siret']}) [{entry['file']}]")
            print()

        if len(siren_duplicates) > 10:
            print(f"... and {len(siren_duplicates) - 10} more duplicate SIREN values")
            print()

    # Check SIRET uniqueness
    siret_duplicates = [(k, v) for k, v in siret_map.items() if len(v) > 1]
    siret_duplicates.sort(key=lambda x: len(x[1]), reverse=True)

    print('=' * 80)
    print('SIRET DUPLICATES')
    print('=' * 80)
    if not siret_duplicates:
        print('✅ All SIRET values are unique!')
    else:
        print(f"❌ Found {len(siret_duplicates)} duplicate SIRET values\n")

        for siret, entries in siret_duplicates[:10]:
            print(f"SIRET: {siret} ({len(entries)} occurrences)")
            for entry in entries:
                print(f"  - {entry['name']} ({entry['kind']}, SIREN: {entry['siren']}) [{entry['file']}]")
            print()

        if len(siret_duplicates) > 10:
            print(f"... and {len(siret_duplicates) - 10} more duplicate SIRET values")
            print()

    # Check SIREN/SIRET pair uniqueness
    pair_duplicates = [(k, v) for k, v in pair_map.items() if len(v) > 1]
    pair_duplicates.sort(key=lambda x: len(x[1]), reverse=True)

    print('=' * 80)
    print('SIREN/SIRET PAIR DUPLICATES')
    print('=' * 80)
    if not pair_duplicates:
        print('✅ All SIREN/SIRET pairs are unique!')
    else:
        print(f"❌ Found {len(pair_duplicates)} duplicate SIREN/SIRET pairs\n")

        for pair, entries in pair_duplicates[:10]:
            siren, siret = pair.split('|')
            print(f"SIREN/SIRET: {siren}/{siret} ({len(entries)} occurrences)")
            for entry in entries:
                print(f"  - {entry['name']} ({entry['kind']}) [{entry['file']}]")
            print()

        if len(pair_duplicates) > 10:
            print(f"... and {len(pair_duplicates) - 10} more duplicate pairs")
            print()

    # Final verdict
    print('=' * 80)
    print('FINAL VERDICT')
    print('=' * 80)

    has_issues = (
        empty_siren > 0 or
        empty_siret > 0 or
        invalid_siren > 0 or
        invalid_siret > 0 or
        len(siren_duplicates) > 0 or
        len(siret_duplicates) > 0 or
        len(pair_duplicates) > 0
    )

    if has_issues:
        print('❌ ISSUES FOUND:')
        if empty_siren > 0:
            print(f"   - {empty_siren} empty SIREN values")
        if empty_siret > 0:
            print(f"   - {empty_siret} empty SIRET values")
        if invalid_siren > 0:
            print(f"   - {invalid_siren} invalid SIREN formats")
        if invalid_siret > 0:
            print(f"   - {invalid_siret} invalid SIRET formats")
        if len(siren_duplicates) > 0:
            print(f"   - {len(siren_duplicates)} duplicate SIREN values")
        if len(siret_duplicates) > 0:
            print(f"   - {len(siret_duplicates)} duplicate SIRET values")
        if len(pair_duplicates) > 0:
            print(f"   - {len(pair_duplicates)} duplicate SIREN/SIRET pairs")
        print()
        print('⚠️  Consider investigating these issues before importing')
        return 1
    else:
        print('✅ All checks passed! Data is ready for import.')
        return 0


if __name__ == '__main__':
    sys.exit(check_uniqueness())
