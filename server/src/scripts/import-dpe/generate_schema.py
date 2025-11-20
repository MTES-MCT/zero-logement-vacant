#!/usr/bin/env python3
"""
Generate complete SQL schema for dpe_raw table from JSONL file

This script analyzes a JSONL file to discover all fields and their types,
then generates the complete SQL schema and Python field definitions.

Usage:
    python3 generate_schema.py dpe_data_complete.jsonl [--sample-size 10000]
"""

import json
import sys
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, Set


def analyze_jsonl_file(file_path: str, sample_size: int = 10000) -> Dict[str, Set[str]]:
    """
    Analyze a single JSONL file to detect all fields and their types

    Args:
        file_path: Path to JSONL file
        sample_size: Number of records to sample (default: 10000)

    Returns:
        Dict mapping field names to their detected types
    """
    field_types = defaultdict(set)
    records_analyzed = 0

    print(f"Analyzing file: {file_path}")
    print(f"Sample size: {sample_size:,} records")
    print()

    file_size = Path(file_path).stat().st_size
    print(f"File size: {file_size / (1024**3):.2f} GB")
    print()

    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if records_analyzed >= sample_size:
                break

            try:
                line_stripped = line.strip()
                if not line_stripped:
                    continue

                data = json.loads(line_stripped)

                for key, value in data.items():
                    if value is None:
                        field_types[key].add('null')
                    elif isinstance(value, bool):
                        field_types[key].add('boolean')
                    elif isinstance(value, int):
                        field_types[key].add('integer')
                    elif isinstance(value, float):
                        field_types[key].add('float')
                    elif isinstance(value, str):
                        field_types[key].add('string')
                    elif isinstance(value, list):
                        field_types[key].add('array')
                    elif isinstance(value, dict):
                        field_types[key].add('object')

                records_analyzed += 1

                # Progress update every 1000 records
                if records_analyzed % 1000 == 0:
                    print(f"  Analyzed: {records_analyzed:,} records...", end='\r')

            except json.JSONDecodeError as e:
                print(f"\nWarning: Invalid JSON at line {line_num}: {e}")
                continue
            except Exception as e:
                print(f"\nError at line {line_num}: {e}")
                continue

    print(f"\n")
    print(f"Total records analyzed: {records_analyzed:,}")
    print(f"Total unique fields found: {len(field_types)}")
    print()

    return field_types


def python_types_to_sql(python_types: Set[str]) -> str:
    """
    Convert Python types to PostgreSQL types

    Args:
        python_types: Set of Python type names

    Returns:
        PostgreSQL type string
    """
    # Remove 'null' as it doesn't affect type choice
    non_null_types = python_types - {'null'}

    if not non_null_types:
        return 'TEXT'  # Default for all-null fields

    # If mixed numeric types, use NUMERIC for safety
    if 'float' in non_null_types and 'integer' in non_null_types:
        return 'NUMERIC'

    if 'float' in non_null_types:
        return 'NUMERIC'

    if 'integer' in non_null_types:
        return 'BIGINT'

    if 'boolean' in non_null_types:
        return 'BOOLEAN'

    if 'array' in non_null_types or 'object' in non_null_types:
        return 'JSONB'

    # Default to TEXT for strings and mixed types
    return 'TEXT'


def generate_sql_schema(field_types: Dict[str, Set[str]]) -> str:
    """
    Generate SQL CREATE TABLE statement

    Args:
        field_types: Dict mapping field names to Python types

    Returns:
        SQL CREATE TABLE statement
    """
    sql_lines = [
        "-- Auto-generated schema for dpe_raw table",
        "-- Generated from DPE JSONL data",
        "",
        "DROP TABLE IF EXISTS dpe_raw CASCADE;",
        "",
        "CREATE TABLE dpe_raw (",
        "    -- Primary key",
        "    dpe_id TEXT PRIMARY KEY,",
    ]

    # Sort fields alphabetically, but keep dpe_id first
    sorted_fields = sorted([k for k in field_types.keys() if k != '_id'])

    # Group fields by category for better organization
    location_fields = []
    performance_fields = []
    technical_fields = []
    date_fields = []
    other_fields = []

    for field in sorted_fields:
        if 'date_' in field:
            date_fields.append(field)
        elif any(x in field for x in ['code_', 'numero_', 'identifiant_', 'adresse_', 'nom_']):
            location_fields.append(field)
        elif any(x in field for x in ['etiquette_', 'conso_', 'emission_', 'cout_']):
            performance_fields.append(field)
        elif any(x in field for x in ['type_', 'configuration_', 'description_', 'qualite_', 'installation_']):
            technical_fields.append(field)
        else:
            other_fields.append(field)

    # Add fields by category
    def add_fields(fields: list, comment: str):
        if fields:
            sql_lines.append(f"\n    -- {comment}")
            for field in fields:
                sql_type = python_types_to_sql(field_types[field])
                # Special handling for date fields
                if 'date_' in field:
                    sql_type = 'DATE'
                sql_lines.append(f"    {field} {sql_type},")

    add_fields(location_fields, "Location and identification")
    add_fields(performance_fields, "Performance metrics")
    add_fields(technical_fields, "Technical details")
    add_fields(date_fields, "Dates")
    add_fields(other_fields, "Other fields")

    # Remove trailing comma from last field
    if sql_lines[-1].endswith(','):
        sql_lines[-1] = sql_lines[-1][:-1]

    sql_lines.extend([
        ");",
        "",
        "-- Indexes for common queries",
        "CREATE INDEX idx_dpe_raw_code_insee ON dpe_raw(code_insee_ban);",
        "CREATE INDEX idx_dpe_raw_code_postal ON dpe_raw(code_postal_ban);",
        "CREATE INDEX idx_dpe_raw_code_departement ON dpe_raw(code_departement_ban);",
        "CREATE INDEX idx_dpe_raw_etiquette_dpe ON dpe_raw(etiquette_dpe);",
        "CREATE INDEX idx_dpe_raw_date_etablissement ON dpe_raw(date_etablissement_dpe);",
        "CREATE INDEX idx_dpe_raw_type_batiment ON dpe_raw(type_batiment);",
        "CREATE INDEX idx_dpe_raw_numero_dpe ON dpe_raw(numero_dpe);",
        "",
        "-- Spatial index for location-based queries (using BAN cartographic coordinates)",
        "CREATE INDEX idx_dpe_raw_location ON dpe_raw(coordonnee_cartographique_x_ban, coordonnee_cartographique_y_ban) WHERE coordonnee_cartographique_x_ban IS NOT NULL AND coordonnee_cartographique_y_ban IS NOT NULL;",
        "",
        "COMMENT ON TABLE dpe_raw IS 'Raw DPE (Diagnostic de Performance Énergétique) data from ADEME';",
    ])

    return '\n'.join(sql_lines)


def generate_field_list(field_types: Dict[str, Set[str]]) -> tuple:
    """
    Generate Python list of all fields for the import script

    Returns:
        Tuple of (field_list, field_mapping_dict)
    """
    # Map JSON fields to database fields
    # _id in JSON becomes dpe_id in database
    field_mapping = {}
    db_fields = []

    for json_field in sorted(field_types.keys()):
        if json_field == '_id':
            field_mapping[json_field] = 'dpe_id'
            db_fields.append('dpe_id')
        else:
            field_mapping[json_field] = json_field
            db_fields.append(json_field)

    return db_fields, field_mapping


def main():
    parser = argparse.ArgumentParser(
        description='Generate DPE raw table schema from JSONL file',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze first 10,000 records (default)
  python generate_schema.py dpe_data_complete.jsonl

  # Analyze first 50,000 records for better type detection
  python generate_schema.py dpe_data_complete.jsonl --sample-size 50000

  # Analyze entire file (warning: may be slow)
  python generate_schema.py dpe_data_complete.jsonl --sample-size 0
        """
    )

    parser.add_argument('input_file', help='Input JSONL file path')
    parser.add_argument('--sample-size', type=int, default=10000,
                       help='Number of records to analyze (0 = all, default: 10000)')

    args = parser.parse_args()

    # Check if file exists
    if not Path(args.input_file).exists():
        print(f"Error: File not found: {args.input_file}")
        sys.exit(1)

    # Analyze file
    print("="*80)
    print("DPE SCHEMA GENERATOR - Single File Mode")
    print("="*80)
    print()

    sample_size = args.sample_size if args.sample_size > 0 else float('inf')
    field_types = analyze_jsonl_file(args.input_file, sample_size)

    # Generate SQL schema
    print("="*80)
    print("GENERATING SQL SCHEMA")
    print("="*80)
    print()

    sql_schema = generate_sql_schema(field_types)

    # Write to file
    output_file = "create_dpe_raw_table_complete.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sql_schema)

    print(f"✅ SQL schema written to: {output_file}")
    print()

    # Generate field list for Python import script
    db_fields, field_mapping = generate_field_list(field_types)

    print("="*80)
    print("FIELD MAPPING FOR IMPORT SCRIPT")
    print("="*80)
    print()
    print(f"Total fields: {len(db_fields)}")
    print()
    print("Sample field mapping (JSON -> Database):")
    for json_field, db_field in sorted(field_mapping.items())[:10]:
        print(f"  {json_field} -> {db_field}")
    print("  ...")
    print()

    # Write field list to a Python file
    field_list_file = "dpe_raw_fields.py"
    with open(field_list_file, 'w', encoding='utf-8') as f:
        f.write('"""Auto-generated field list for DPE raw data import"""\n\n')
        f.write('# All fields in the dpe_raw table\n')
        f.write('DPE_RAW_FIELDS = [\n')
        for field in db_fields:
            f.write(f'    "{field}",\n')
        f.write(']\n\n')
        f.write('# Mapping from JSON field names to database field names\n')
        f.write('JSON_TO_DB_FIELD_MAPPING = {\n')
        for json_field, db_field in sorted(field_mapping.items()):
            f.write(f'    "{json_field}": "{db_field}",\n')
        f.write('}\n')

    print(f"✅ Field list written to: {field_list_file}")
    print()

    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total fields discovered: {len(field_types)}")
    print()
    print("Generated files:")
    print(f"  1. {output_file} - SQL schema")
    print(f"  2. {field_list_file} - Python field definitions")
    print()
    print("Next steps:")
    print(f"  1. Review {output_file}")
    print(f"  2. Create table: psql -d <database> -f {output_file}")
    print(f"  3. Run import: python import_dpe_raw.py <input_file> --db-url <url>")
    print("="*80)


if __name__ == "__main__":
    main()
