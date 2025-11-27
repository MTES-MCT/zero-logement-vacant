#!/usr/bin/env python3
"""
Split DPE raw JSONL file into year/month structure.

Input: dpe_ademe_complet.jsonl
Output: dpe_split/YYYY/YYYY-MM.jsonl

Each line is a JSON object with a 'date_etablissement_dpe' field.
"""

import json
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def parse_date(date_str):
    """Parse date string in format YYYY-MM-DD."""
    try:
        return datetime.strptime(date_str, '%Y-%m-%d')
    except (ValueError, TypeError):
        return None


def split_dpe_file(input_file, output_dir='dpe_split'):
    """Split DPE JSONL file by year and month."""

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    # Track statistics
    stats = {
        'total_lines': 0,
        'valid_dates': 0,
        'invalid_dates': 0,
        'by_year_month': defaultdict(int)
    }

    # Open file handles for each year/month combination
    file_handles = {}

    print(f"📂 Reading {input_file}...")
    print(f"📝 Output directory: {output_dir}/")

    with open(input_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            stats['total_lines'] += 1

            # Progress indicator
            if line_num % 10000 == 0:
                print(f"   Processed {line_num:,} lines...", end='\r')

            try:
                # Parse JSON
                data = json.loads(line.strip())
                date_str = data.get('date_etablissement_dpe')

                if not date_str:
                    stats['invalid_dates'] += 1
                    continue

                # Parse date
                date_obj = parse_date(date_str)
                if not date_obj:
                    stats['invalid_dates'] += 1
                    continue

                stats['valid_dates'] += 1

                # Create year/month key
                year = date_obj.year
                month = date_obj.month
                year_month_key = f"{year}/{year:04d}-{month:02d}"

                stats['by_year_month'][year_month_key] += 1

                # Get or create file handle
                if year_month_key not in file_handles:
                    # Create year directory
                    year_dir = output_path / str(year)
                    year_dir.mkdir(exist_ok=True)

                    # Open JSONL file for this month
                    file_path = year_dir / f"{year:04d}-{month:02d}.jsonl"
                    file_handles[year_month_key] = open(file_path, 'w', encoding='utf-8')

                # Write line to appropriate file
                file_handles[year_month_key].write(line)

            except json.JSONDecodeError as e:
                print(f"\n⚠️  Invalid JSON on line {line_num}: {e}")
                stats['invalid_dates'] += 1
                continue
            except Exception as e:
                print(f"\n⚠️  Error on line {line_num}: {e}")
                stats['invalid_dates'] += 1
                continue

    # Close all file handles
    for fh in file_handles.values():
        fh.close()

    print(f"\n\n✅ Split complete!")
    print(f"\n📊 Statistics:")
    print(f"   Total lines: {stats['total_lines']:,}")
    print(f"   Valid dates: {stats['valid_dates']:,}")
    print(f"   Invalid dates: {stats['invalid_dates']:,}")
    print(f"   Files created: {len(file_handles)}")

    # Print breakdown by year
    print(f"\n📅 Breakdown by year:")
    years_data = defaultdict(int)
    for year_month_key, count in sorted(stats['by_year_month'].items()):
        year = year_month_key.split('/')[0]
        years_data[year] += count

    for year in sorted(years_data.keys()):
        print(f"   {year}: {years_data[year]:,} DPE")

    # Print breakdown by month (for latest year)
    latest_year = max(years_data.keys())
    print(f"\n📅 Breakdown for {latest_year}:")
    for year_month_key, count in sorted(stats['by_year_month'].items()):
        if year_month_key.startswith(latest_year):
            month = year_month_key.split('-')[1].replace('.jsonl', '')
            print(f"   {year_month_key}: {count:,} DPE")

    print(f"\n📂 Files created in: {output_dir}/")
    print(f"   Structure: {output_dir}/YYYY/YYYY-MM.jsonl")


if __name__ == '__main__':
    import sys

    input_file = 'dpe_ademe_complet.jsonl'
    output_dir = 'dpe_split'

    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_dir = sys.argv[2]

    if not os.path.exists(input_file):
        print(f"❌ Error: Input file '{input_file}' not found")
        print(f"\nUsage: {sys.argv[0]} [input_file] [output_dir]")
        print(f"   Default: {sys.argv[0]} dpe_ademe_complet.jsonl dpe_split")
        sys.exit(1)

    split_dpe_file(input_file, output_dir)
