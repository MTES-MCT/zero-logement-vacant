#!/usr/bin/env python3
"""
Merge users.csv with structures.csv, groups.csv, and perimeters.csv.
Join keys:
  - users.structure -> structures.id_structure
  - users.groupe -> groups.id_groupe
  - groups.perimetre -> perimeters.id (via groupe)
"""

import csv
import os
from pathlib import Path

def load_csv(filepath, id_field):
    """Load CSV into a dict keyed by id_field."""
    data = {}
    fields = []
    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        print(f"  Warning: {filepath} is empty or missing")
        return data, fields

    with open(filepath, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        fields = [f for f in reader.fieldnames if f != id_field]
        for row in reader:
            key = row.get(id_field)
            if key:
                data[key] = row
    return data, fields

def main():
    script_dir = Path(__file__).parent
    users_file = script_dir / 'users.csv'
    structures_file = script_dir / 'structures.csv'
    groups_file = script_dir / 'groups.csv'
    perimeters_file = script_dir / 'perimeters.csv'
    output_file = script_dir / 'users_full.csv'

    # Load structures
    print(f"Loading structures from {structures_file}...")
    structures, structure_fields = load_csv(structures_file, 'id_structure')
    print(f"  Loaded {len(structures)} structures")

    # Load perimeters
    print(f"Loading perimeters from {perimeters_file}...")
    perimeters, perimeter_fields = load_csv(perimeters_file, 'perimetre_id')
    print(f"  Loaded {len(perimeters)} perimeters")

    # Load groups
    print(f"Loading groups from {groups_file}...")
    groups, group_fields = load_csv(groups_file, 'id_groupe')
    print(f"  Loaded {len(groups)} groups")

    # Load users
    print(f"Loading users from {users_file}...")
    with open(users_file, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        user_fields = reader.fieldnames
        users = list(reader)
    print(f"  Loaded {len(users)} users")

    # Build output fieldnames
    output_fields = list(user_fields)
    output_fields += [f"structure_{f}" for f in structure_fields]
    output_fields += [f"groupe_{f}" for f in group_fields]
    output_fields += [f"perimetre_{f}" for f in perimeter_fields]

    # Join and write
    print(f"Merging and writing to {output_file}...")
    structure_matched = 0
    group_matched = 0
    perimetre_matched = 0

    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=output_fields)
        writer.writeheader()

        for user in users:
            row = dict(user)

            # Join structure
            structure_id = user.get('structure')
            if structure_id and structure_id in structures:
                for field in structure_fields:
                    row[f"structure_{field}"] = structures[structure_id].get(field, '')
                structure_matched += 1

            # Join group
            groupe_id = user.get('groupe')
            if groupe_id and groupe_id in groups:
                group = groups[groupe_id]
                for field in group_fields:
                    row[f"groupe_{field}"] = group.get(field, '')
                group_matched += 1

                # Join perimetre from group
                perimetre_id = group.get('perimetre')
                if perimetre_id and perimetre_id in perimeters:
                    for field in perimeter_fields:
                        row[f"perimetre_{field}"] = perimeters[perimetre_id].get(field, '')
                    perimetre_matched += 1

            writer.writerow(row)

    print(f"\nDone!")
    print(f"  Users with structure: {structure_matched}/{len(users)}")
    print(f"  Users with group: {group_matched}/{len(users)}")
    print(f"  Users with perimetre: {perimetre_matched}/{len(users)}")
    print(f"  Output: {output_file}")

if __name__ == "__main__":
    main()
