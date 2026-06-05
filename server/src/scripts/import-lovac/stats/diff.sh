#!/bin/bash
# Compare two snapshot JSON files and print a delta table.
#
# Usage:
#   ./stats/diff.sh <pre.json> <post.json>
#
# Example:
#   ./stats/diff.sh snapshot-owners-pre.json snapshot-owners-post.json
set -euo pipefail

PRE="${1:?Usage: $0 <pre.json> <post.json>}"
POST="${2:?Usage: $0 <pre.json> <post.json>}"

if [ ! -f "$PRE" ]; then echo "Error: file not found: $PRE" >&2; exit 1; fi
if [ ! -f "$POST" ]; then echo "Error: file not found: $POST" >&2; exit 1; fi

python3 - "$PRE" "$POST" <<'EOF'
import json, sys

def load(path):
    with open(path) as f:
        data = json.load(f)
    # Support array of objects with metric/value or category/value
    result = {}
    if isinstance(data, list):
        for row in data:
            key = row.get('metric') or row.get('category') or str(row)
            result[key] = row.get('value', 0)
    return result

pre = load(sys.argv[1])
post = load(sys.argv[2])

all_keys = sorted(set(pre) | set(post))
label_w = max((len(k) for k in all_keys), default=10) + 2

print(f"{'Métrique':<{label_w}} {'Avant':>15} {'Après':>15} {'Δ':>20}")
print("-" * (label_w + 55))

for key in all_keys:
    before = pre.get(key, 0)
    after = post.get(key, 0)
    delta = after - before
    pct = f" ({delta/before*100:+.1f}%)" if before else ""
    delta_str = f"{delta:+,}{pct}"
    print(f"{key:<{label_w}} {before:>15,} {after:>15,} {delta_str:>20}")
EOF
