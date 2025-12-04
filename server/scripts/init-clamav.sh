#!/bin/bash

# Script to initialize ClamAV on macOS for development
# This script:
# 1. Checks if ClamAV is installed
# 2. Creates necessary directories
# 3. Generates configuration files
# 4. Downloads virus definitions
# 5. Starts clamd daemon

set -e

echo "🔍 Initializing ClamAV for development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS
OS="$(uname -s)"
if [ "$OS" != "Darwin" ]; then
    echo -e "${RED}❌ This script is designed for macOS only${NC}"
    exit 1
fi

# Check if ClamAV is installed
if ! command -v clamd &> /dev/null; then
    echo -e "${YELLOW}⚠️  ClamAV is not installed${NC}"
    echo "Installing ClamAV via Homebrew..."
    brew install clamav
fi

echo -e "${GREEN}✓${NC} ClamAV is installed"

# Determine Homebrew prefix
HOMEBREW_PREFIX=$(brew --prefix)
CLAMAV_PREFIX="${HOMEBREW_PREFIX}/etc/clamav"
CLAMAV_DB_DIR="${HOMEBREW_PREFIX}/var/lib/clamav"
CLAMAV_LOG_DIR="${HOMEBREW_PREFIX}/var/log/clamav"
CLAMAV_RUN_DIR="${HOMEBREW_PREFIX}/var/run/clamav"

echo "ClamAV prefix: $CLAMAV_PREFIX"

# Create necessary directories
echo "Creating ClamAV directories..."
mkdir -p "$CLAMAV_DB_DIR"
mkdir -p "$CLAMAV_LOG_DIR"
mkdir -p "$CLAMAV_RUN_DIR"
echo -e "${GREEN}✓${NC} Directories created"

# Create clamd.conf if it doesn't exist
CLAMD_CONF="$CLAMAV_PREFIX/clamd.conf"
if [ ! -f "$CLAMD_CONF" ]; then
    echo "Creating clamd.conf..."

    # Copy example config if available
    if [ -f "$CLAMAV_PREFIX/clamd.conf.sample" ]; then
        cp "$CLAMAV_PREFIX/clamd.conf.sample" "$CLAMD_CONF"
    else
        # Create minimal config
        cat > "$CLAMD_CONF" << EOF
# ClamAV configuration for development
LogFile $CLAMAV_LOG_DIR/clamd.log
LogTime yes
LogFileMaxSize 10M
LogVerbose no
PidFile $CLAMAV_RUN_DIR/clamd.pid
DatabaseDirectory $CLAMAV_DB_DIR
LocalSocket $CLAMAV_RUN_DIR/clamd.sock
FixStaleSocket yes
TCPSocket 3310
TCPAddr 127.0.0.1
MaxConnectionQueueLength 15
MaxThreads 12
ReadTimeout 180
SelfCheck 3600
User $(whoami)
EOF
    fi

    # Comment out Example line if present
    sed -i '' 's/^Example/#Example/' "$CLAMD_CONF"

    echo -e "${GREEN}✓${NC} clamd.conf created at $CLAMD_CONF"
else
    echo -e "${GREEN}✓${NC} clamd.conf already exists"
fi

# Create freshclam.conf if it doesn't exist
FRESHCLAM_CONF="$CLAMAV_PREFIX/freshclam.conf"
if [ ! -f "$FRESHCLAM_CONF" ]; then
    echo "Creating freshclam.conf..."

    if [ -f "$CLAMAV_PREFIX/freshclam.conf.sample" ]; then
        cp "$CLAMAV_PREFIX/freshclam.conf.sample" "$FRESHCLAM_CONF"
    else
        cat > "$FRESHCLAM_CONF" << EOF
# FreshClam configuration for development
DatabaseDirectory $CLAMAV_DB_DIR
UpdateLogFile $CLAMAV_LOG_DIR/freshclam.log
LogTime yes
LogVerbose no
DatabaseMirror database.clamav.net
MaxAttempts 5
ScriptedUpdates yes
EOF
    fi

    # Comment out Example line if present
    sed -i '' 's/^Example/#Example/' "$FRESHCLAM_CONF"

    echo -e "${GREEN}✓${NC} freshclam.conf created at $FRESHCLAM_CONF"
else
    echo -e "${GREEN}✓${NC} freshclam.conf already exists"
fi

# Update virus definitions
echo "📥 Updating virus definitions (this may take a few minutes)..."
if freshclam --config-file="$FRESHCLAM_CONF" --datadir="$CLAMAV_DB_DIR" 2>&1 | grep -q "up-to-date"; then
    echo -e "${GREEN}✓${NC} Virus definitions are up to date"
elif freshclam --config-file="$FRESHCLAM_CONF" --datadir="$CLAMAV_DB_DIR"; then
    echo -e "${GREEN}✓${NC} Virus definitions updated"
else
    echo -e "${YELLOW}⚠️  Could not update virus definitions${NC}"
    echo "You can update them manually later with: freshclam --config-file=$FRESHCLAM_CONF"
fi

# Check if virus database exists
if [ ! -f "$CLAMAV_DB_DIR/main.cvd" ] && [ ! -f "$CLAMAV_DB_DIR/main.cld" ]; then
    echo -e "${YELLOW}⚠️  Warning: Virus database not found${NC}"
    echo "Run: freshclam --config-file=$FRESHCLAM_CONF"
fi

echo ""
echo -e "${GREEN}✅ ClamAV initialization complete!${NC}"
echo ""
echo "Configuration files:"
echo "  - clamd.conf: $CLAMD_CONF"
echo "  - freshclam.conf: $FRESHCLAM_CONF"
echo ""
echo "To start ClamAV daemon:"
echo "  ./scripts/start-clamav.sh"
echo ""
echo "To stop ClamAV daemon:"
echo "  ./scripts/stop-clamav.sh"
