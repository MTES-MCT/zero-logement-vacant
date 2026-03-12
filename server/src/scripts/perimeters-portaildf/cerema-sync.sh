#!/bin/bash -l
# cerema-sync.sh - Cerema Data Synchronization Script
# Synchronizes structures and users from Cerema DF Portal API
# Can be scheduled at any frequency (e.g., every 30 minutes, daily, etc.)

set -e
set -o pipefail

echo "=== Cerema Data Sync - $(date) ==="

# Navigate to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check Cerema credentials
if [ -z "$CEREMA_USERNAME" ] || [ -z "$CEREMA_PASSWORD" ]; then
    echo "ERROR: CEREMA_USERNAME and CEREMA_PASSWORD environment variables must be set"
    exit 1
fi

# Auth version: v1 (legacy) or v2 (DataFoncier API)
AUTH_VERSION="${CEREMA_AUTH_VERSION:-v1}"
echo "Using auth version: $AUTH_VERSION"

# Check database connection variables (Clever Cloud naming convention)
if [ -z "$POSTGRESQL_ADDON_HOST" ] || [ -z "$POSTGRESQL_ADDON_DB" ] || [ -z "$POSTGRESQL_ADDON_USER" ] || [ -z "$POSTGRESQL_ADDON_PASSWORD" ]; then
    echo "ERROR: Database connection variables not set"
    echo "Required: POSTGRESQL_ADDON_HOST, POSTGRESQL_ADDON_DB, POSTGRESQL_ADDON_USER, POSTGRESQL_ADDON_PASSWORD, POSTGRESQL_ADDON_PORT"
    exit 1
fi

# Export database variables for Python scripts
export DB_HOST="$POSTGRESQL_ADDON_HOST"
export DB_NAME="$POSTGRESQL_ADDON_DB"
export DB_USER="$POSTGRESQL_ADDON_USER"
export DB_PASSWORD="$POSTGRESQL_ADDON_PASSWORD"
export DB_PORT="${POSTGRESQL_ADDON_PORT:-5432}"

# Create logs directory if it doesn't exist
mkdir -p logs

LOG_FILE="logs/sync-$(date +%Y%m%d-%H%M%S).log"

# Redirect output to both console and log file
{

# Authenticate and get API token
echo "Authenticating with Cerema API..."

if [ "$AUTH_VERSION" = "v2" ]; then
    # V2: POST /api/token/ with JSON body, returns { access, refresh }
    API_URL="${CEREMA_API_V2:-https://datafoncier.cerema.fr}"
    AUTH_RESPONSE=$(curl -s -X POST "$API_URL/api/token/" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$CEREMA_USERNAME\", \"password\": \"$CEREMA_PASSWORD\"}")

    # Extract access token from JSON response
    export CEREMA_BEARER_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"access":"[^"]*"' | cut -d'"' -f4)
else
    # V1: POST /api/api-token-auth/ with form-data, returns { token }
    API_URL="${CEREMA_API:-https://portaildf.cerema.fr}"
    AUTH_RESPONSE=$(curl -s -X POST "$API_URL/api/api-token-auth/" \
        -d "username=$CEREMA_USERNAME" \
        -d "password=$CEREMA_PASSWORD")

    # Extract token from JSON response
    export CEREMA_BEARER_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$CEREMA_BEARER_TOKEN" ]; then
    echo "✗ ERROR: Failed to obtain authentication token"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✓ Authentication successful (token obtained from $API_URL)"

# Detect python command (python3 or python)
PYTHON_CMD=$(command -v python3 || command -v python || echo "")
if [ -z "$PYTHON_CMD" ]; then
    echo "✗ ERROR: Python not found. Please install Python 3"
    exit 1
fi
echo "Using Python: $PYTHON_CMD"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
if [ -f requirements.txt ]; then
    if pip3 install -q -r requirements.txt; then
        echo "✓ Dependencies installed successfully"
    else
        echo "✗ ERROR: Failed to install dependencies"
        exit 1
    fi
else
    echo "⚠ WARNING: requirements.txt not found, skipping dependency installation"
fi

# 1. Retrieve latest data from API
echo ""
echo "Step 1/3: Retrieving data from Cerema API..."
cd 01-cerema-scraper/
if $PYTHON_CMD cerema-scraper.py; then
    echo "✓ Data retrieval successful"
else
    echo "✗ ERROR: Data retrieval failed"
    exit 1
fi

# 2. Verify and update structures/establishments
echo ""
echo "Step 2/3: Verifying structures..."
cd ../02-establishment-verifier/

# Preview changes first
echo "  Preview mode (dry-run):"
if $PYTHON_CMD establishment-verifier.py --jsonl-file ../01-cerema-scraper/structures.jsonl --dry-run; then
    echo "  ✓ Structure verification preview completed"

    # Apply changes
    echo "  Applying structure updates:"
    if $PYTHON_CMD establishment-verifier.py --jsonl-file ../01-cerema-scraper/structures.jsonl; then
        echo "✓ Structure updates applied successfully"
    else
        echo "✗ ERROR: Failed to apply structure updates"
        exit 1
    fi
else
    echo "✗ ERROR: Structure verification failed"
    exit 1
fi

# 3. Verify and update users
echo ""
echo "Step 3/3: Verifying users..."
cd ../03-users-verifier/

# Preview changes first
echo "  Preview mode (dry-run):"
if $PYTHON_CMD user-verifier.py \
    --users-file ../01-cerema-scraper/users.jsonl \
    --structures-file ../01-cerema-scraper/structures.jsonl \
    --dry-run; then
    echo "  ✓ User verification preview completed"

    # Apply changes
    echo "  Applying user updates:"
    if $PYTHON_CMD user-verifier.py \
        --users-file ../01-cerema-scraper/users.jsonl \
        --structures-file ../01-cerema-scraper/structures.jsonl; then
        echo "✓ User updates applied successfully"
    else
        echo "✗ ERROR: Failed to apply user updates"
        exit 1
    fi
else
    echo "✗ ERROR: User verification failed"
    exit 1
fi

echo ""
echo "=== Sync completed successfully at $(date) ==="
echo "Log file: $LOG_FILE"

# Clean up old logs (keep last 30 days)
cd "$SCRIPT_DIR/logs"
find . -name "sync-*.log" -mtime +30 -delete 2>/dev/null || true

} 2>&1 | tee -a "$LOG_FILE"

exit 0
