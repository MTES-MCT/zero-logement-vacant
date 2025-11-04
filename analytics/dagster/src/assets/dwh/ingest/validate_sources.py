#!/usr/bin/env python3
"""
Helper script to validate external source URLs and test DuckDB loading.

Usage:
    python validate_sources.py                    # Validate all sources
    python validate_sources.py carte_des_loyers   # Validate specific source
    python validate_sources.py --producer INSEE   # Validate all INSEE sources
"""

import sys
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))

from src.assets.dwh.ingest.queries.external_sources_config import (
    EXTERNAL_SOURCES,
    generate_create_table_sql,
    get_sources_by_producer,
)

try:
    import duckdb
    import requests
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install duckdb requests")
    sys.exit(1)


def check_url_accessibility(url: str) -> tuple[bool, str]:
    """Check if a URL is accessible."""
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        if response.status_code == 200:
            return True, "✅ Accessible"
        else:
            return False, f"❌ HTTP {response.status_code}"
    except requests.exceptions.Timeout:
        return False, "❌ Timeout"
    except requests.exceptions.RequestException as e:
        return False, f"❌ Error: {str(e)}"


def test_duckdb_loading(source_name: str, config: dict) -> tuple[bool, str]:
    """Test if DuckDB can load the source."""
    try:
        conn = duckdb.connect(":memory:")
        
        # Generate SQL
        sql = generate_create_table_sql(source_name, config)
        
        # Try to execute (with LIMIT to avoid loading entire file)
        test_sql = sql.replace(
            "CREATE OR REPLACE TABLE",
            "CREATE OR REPLACE TEMP TABLE"
        ).replace(
            "SELECT * FROM",
            "SELECT * FROM (SELECT * FROM"
        ).rstrip(";") + " LIMIT 100);"
        
        conn.execute(test_sql)
        
        # Get row count
        row_count = conn.execute(
            f"SELECT COUNT(*) FROM {config['schema']}.{config['table_name']}"
        ).fetchone()[0]
        
        conn.close()
        return True, f"✅ Loaded {row_count} rows (sample)"
    
    except Exception as e:
        return False, f"❌ DuckDB Error: {str(e)}"


def validate_source(source_name: str, config: dict, check_loading: bool = False):
    """Validate a single source."""
    print(f"\n{'='*80}")
    print(f"Source: {source_name}")
    print(f"{'='*80}")
    print(f"Producer:    {config['producer']}")
    print(f"Schema:      {config['schema']}")
    print(f"Table:       {config['table_name']}")
    print(f"File Type:   {config['file_type']}")
    print(f"URL:         {config['url']}")
    print(f"Description: {config['description']}")
    
    # Check URL accessibility
    print("\nChecking URL accessibility...")
    accessible, message = check_url_accessibility(config['url'])
    print(f"  {message}")
    
    # Test DuckDB loading if requested and URL is accessible
    if check_loading and accessible:
        print("\nTesting DuckDB loading (first 100 rows)...")
        success, message = test_duckdb_loading(source_name, config)
        print(f"  {message}")
        return success
    
    return accessible


def main():
    parser = argparse.ArgumentParser(
        description="Validate external data source URLs and test DuckDB loading"
    )
    parser.add_argument(
        "source_name",
        nargs="?",
        help="Specific source to validate (omit to validate all)",
    )
    parser.add_argument(
        "--producer",
        help="Validate all sources from a specific producer",
    )
    parser.add_argument(
        "--test-loading",
        action="store_true",
        help="Test DuckDB loading (slower but more thorough)",
    )
    
    args = parser.parse_args()
    
    # Determine which sources to validate
    if args.source_name:
        if args.source_name not in EXTERNAL_SOURCES:
            print(f"Error: Source '{args.source_name}' not found.")
            print(f"\nAvailable sources:")
            for name in sorted(EXTERNAL_SOURCES.keys()):
                print(f"  - {name}")
            sys.exit(1)
        sources_to_validate = {args.source_name: EXTERNAL_SOURCES[args.source_name]}
    elif args.producer:
        sources_to_validate = get_sources_by_producer(args.producer)
        if not sources_to_validate:
            print(f"Error: No sources found for producer '{args.producer}'.")
            print(f"\nAvailable producers:")
            producers = sorted(set(c["producer"] for c in EXTERNAL_SOURCES.values()))
            for producer in producers:
                print(f"  - {producer}")
            sys.exit(1)
    else:
        sources_to_validate = EXTERNAL_SOURCES
    
    # Validate sources
    print(f"\nValidating {len(sources_to_validate)} source(s)...")
    
    results = {}
    for source_name, config in sources_to_validate.items():
        success = validate_source(source_name, config, args.test_loading)
        results[source_name] = success
    
    # Print summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    
    success_count = sum(1 for v in results.values() if v)
    fail_count = len(results) - success_count
    
    print(f"✅ Successful: {success_count}/{len(results)}")
    print(f"❌ Failed:     {fail_count}/{len(results)}")
    
    if fail_count > 0:
        print("\nFailed sources:")
        for source_name, success in results.items():
            if not success:
                print(f"  - {source_name}")
        sys.exit(1)
    else:
        print("\n🎉 All sources validated successfully!")


if __name__ == "__main__":
    main()


