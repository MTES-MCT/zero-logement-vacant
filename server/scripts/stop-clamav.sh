#!/bin/bash

# Script to stop ClamAV daemon
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🛑 Stopping ClamAV daemon..."

# Detect OS
OS="$(uname -s)"
if [ "$OS" != "Darwin" ]; then
    echo -e "${RED}❌ This script is designed for macOS only${NC}"
    exit 1
fi

# Determine Homebrew prefix
HOMEBREW_PREFIX=$(brew --prefix)
CLAMAV_RUN_DIR="${HOMEBREW_PREFIX}/var/run/clamav"
PID_FILE="$CLAMAV_RUN_DIR/clamd.pid"

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠️  ClamAV daemon is not running (no PID file)${NC}"
    exit 0
fi

# Get PID
PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  ClamAV daemon is not running (stale PID file)${NC}"
    rm -f "$PID_FILE"
    exit 0
fi

# Stop the daemon
echo "Stopping ClamAV daemon (PID: $PID)..."
kill "$PID"

# Wait for process to stop
for i in {1..10}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        rm -f "$PID_FILE"
        echo -e "${GREEN}✅ ClamAV daemon stopped successfully${NC}"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
echo "Process did not stop gracefully, force killing..."
kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo -e "${GREEN}✅ ClamAV daemon stopped (forced)${NC}"
