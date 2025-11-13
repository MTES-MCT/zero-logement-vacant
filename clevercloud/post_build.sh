#!/usr/bin/env bash
# Post-build script for Clever Cloud
# Installs Python dependencies required for Cerema sync scripts

set -e

echo "=== Installing Python dependencies for Cerema scripts ==="

# Check if pip3 is available
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
else
    echo "WARNING: pip not found, skipping Python dependencies installation"
    exit 0
fi

# Install dependencies for perimeters-portaildf scripts
REQUIREMENTS_FILE="server/src/scripts/perimeters-portaildf/requirements.txt"

if [ -f "$REQUIREMENTS_FILE" ]; then
    echo "Installing dependencies from $REQUIREMENTS_FILE"
    $PIP_CMD install --user -r "$REQUIREMENTS_FILE"
    echo "✓ Python dependencies installed successfully"
else
    echo "WARNING: $REQUIREMENTS_FILE not found"
fi

exit 0
