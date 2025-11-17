#!/usr/bin/env bash
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
    echo "These are used to authenticate with: https://portaildf.cerema.fr/api/api-token-auth/"
    exit 1
fi

# Check database connection variables
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: Database connection variables not set"
    echo "Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

LOG_FILE="logs/sync-$(date +%Y%m%d-%H%M%S).log"

# Redirect output to both console and log file
{

# Authenticate and get API token
echo "Authenticating with Cerema API..."
AUTH_RESPONSE=$(curl -s -X POST https://portaildf.cerema.fr/api/api-token-auth/ \
    -d "username=$CEREMA_USERNAME" \
    -d "password=$CEREMA_PASSWORD")

# Extract token from JSON response
export CEREMA_BEARER_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CEREMA_BEARER_TOKEN" ]; then
    echo "✗ ERROR: Failed to obtain authentication token"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✓ Authentication successful (token obtained)"

# Detect python command (python3 or python)
PYTHON_CMD=$(command -v python3 || command -v python || echo "")
if [ -z "$PYTHON_CMD" ]; then
    echo "✗ ERROR: Python not found. Please install Python 3"
    exit 1
fi
echo "Using Python: $PYTHON_CMD"

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
