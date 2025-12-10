#!/bin/bash

# Script to start ClamAV daemon for development
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Starting ClamAV daemon..."

# Detect OS
OS="$(uname -s)"
if [ "$OS" != "Darwin" ]; then
    echo -e "${RED}❌ This script is designed for macOS only${NC}"
    exit 1
fi

# Check if ClamAV is installed
if ! command -v clamd &> /dev/null; then
    echo -e "${RED}❌ ClamAV is not installed${NC}"
    echo "Run: ./scripts/init-clamav.sh"
    exit 1
fi

# Determine Homebrew prefix
HOMEBREW_PREFIX=$(brew --prefix)
CLAMAV_PREFIX="${HOMEBREW_PREFIX}/etc/clamav"
CLAMAV_RUN_DIR="${HOMEBREW_PREFIX}/var/run/clamav"
CLAMD_CONF="$CLAMAV_PREFIX/clamd.conf"
PID_FILE="$CLAMAV_RUN_DIR/clamd.pid"

# Check if config exists
if [ ! -f "$CLAMD_CONF" ]; then
    echo -e "${RED}❌ Configuration file not found: $CLAMD_CONF${NC}"
    echo "Run: ./scripts/init-clamav.sh"
    exit 1
fi

# Check if clamd is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  ClamAV daemon is already running (PID: $PID)${NC}"
        exit 0
    else
        echo "Removing stale PID file..."
        rm -f "$PID_FILE"
    fi
fi

# Start clamd
echo "Starting clamd with config: $CLAMD_CONF"
clamd --config-file="$CLAMD_CONF"

# Wait a bit for daemon to start
sleep 2

# Verify it started
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ClamAV daemon started successfully (PID: $PID)${NC}"
        echo ""
        echo "Socket: $CLAMAV_RUN_DIR/clamd.sock"
        echo "TCP: 127.0.0.1:3310"
        echo ""
        echo "To stop: ./scripts/stop-clamav.sh"
    else
        echo -e "${RED}❌ Failed to start ClamAV daemon${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to start ClamAV daemon (no PID file created)${NC}"
    exit 1
fi
