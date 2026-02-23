#!/usr/bin/env python3
"""
Join groups and structures CSV files on structure ID.
"""

import csv
import sys
from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    groups_file = script_dir / 'groups.csv'
    structures_file = script_dir / 'structures.csv'
    output_file = script_dir / 'groups_with_structures.csv'

    # Load structures into a dict keyed by id_structure
    print(f"Loading structures from {structures_file}...")
    structures = {}
    with open(structures_file, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        structure_fields = reader.fieldnames
        for row in reader:
            structures[row['id_structure']] = row
    print(f"  Loaded {len(structures)} structures")

    # Read groups and join with structures
    print(f"Loading groups from {groups_file}...")
    with open(groups_file, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        group_fields = reader.fieldnames
        groups = list(reader)
    print(f"  Loaded {len(groups)} groups")

    # Create output fieldnames: group fields + structure fields (prefixed)
    structure_prefixed_fields = [f"structure_{f}" for f in structure_fields if f != 'id_structure']
    output_fields = group_fields + structure_prefixed_fields

    # Join and write output
    print(f"Joining and writing to {output_file}...")
    matched = 0
    unmatched = 0

    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=output_fields)
        writer.writeheader()

        for group in groups:
            structure_id = group.get('structure')
            output_row = dict(group)

            if structure_id and structure_id in structures:
                structure = structures[structure_id]
                for field in structure_fields:
                    if field != 'id_structure':
                        output_row[f"structure_{field}"] = structure.get(field, '')
                matched += 1
            else:
                unmatched += 1

            writer.writerow(output_row)

    print(f"\nDone!")
    print(f"  Groups matched: {matched}")
    print(f"  Groups unmatched: {unmatched}")
    print(f"  Output: {output_file}")

if __name__ == "__main__":
    main()
