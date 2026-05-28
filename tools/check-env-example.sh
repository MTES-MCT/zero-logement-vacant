#!/usr/bin/env bash
# Validates that .env.example files cover all env vars consumed in code.
#
# Server:   scans env('VAR') calls in server/src/infra/config.ts
# Frontend: scans import.meta.env.VITE_* across frontend/src/
#
# Usage: bash tools/check-env-example.sh
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
errors=0

example_keys() {
  grep -v '^\s*#' "$1" | grep -v '^\s*$' | cut -d= -f1 | sort -u
}

check() {
  local label=$1 example_file=$2
  shift 2
  local code_vars
  code_vars=$(echo "$@" | tr ' ' '\n' | sort -u)
  local missing
  missing=$(comm -23 <(echo "$code_vars") <(example_keys "$example_file"))
  if [ -n "$missing" ]; then
    echo "✗ $label: missing from .env.example:" >&2
    echo "$missing" | sed 's/^/    - /' >&2
    errors=1
  else
    echo "✓ $label: .env.example is up-to-date"
  fi
}

server_vars=$(grep -oE "env\('[A-Z][A-Z0-9_]+'\)" "$ROOT/server/src/infra/config.ts" | grep -oE "[A-Z][A-Z0-9_]+")
frontend_vars=$(grep -roh "VITE_[A-Z][A-Z0-9_]*" "$ROOT/frontend/src/" | sort -u)

check "server"   "$ROOT/server/.env.example"   $server_vars
check "frontend" "$ROOT/frontend/.env.example" $frontend_vars

exit $errors
