#!/usr/bin/env python3
"""
Extract _i and _rand from the last line of a JSONL file.

Usage:
    python get_last_record.py /path/to/file.jsonl

Output:
    _i and _rand values for use with import-ademe.py --resume-i --resume-rand
"""

import json
import sys


def get_last_record(filepath):
    """Get _i and _rand from last line of JSONL file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            # Read all lines and get the last non-empty one
            lines = f.readlines()
            for line in reversed(lines):
                line = line.strip()
                if line:
                    data = json.loads(line)
                    _i = data.get('_i')
                    _rand = data.get('_rand')

                    if _i is not None and _rand is not None:
                        print(f"_i={_i}")
                        print(f"_rand={_rand}")
                        print(f"\nResume command:")
                        print(f"python import-ademe.py --resume-i {_i} --resume-rand {_rand}")
                        return _i, _rand
                    else:
                        print("❌ Last record missing _i or _rand fields")
                        return None, None

            print("❌ No valid records found in file")
            return None, None

    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        return None, None
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in last line: {e}")
        return None, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python get_last_record.py /path/to/file.jsonl")
        sys.exit(1)

    filepath = sys.argv[1]
    get_last_record(filepath)
