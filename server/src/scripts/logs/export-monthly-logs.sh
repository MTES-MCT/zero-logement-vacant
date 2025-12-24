#!/bin/bash
# export-monthly-logs.sh
#
# Export Elasticsearch logs from the previous month to S3 (Cellar)
# Convention: zlv-logs-YYYY-MM.json.gz
#
# Usage: ./export-monthly-logs.sh [YYYY-MM]
# If no argument provided, exports the previous month
#
# Required environment variables:
#   ES_HOST, ES_USER, ES_PASS - Elasticsearch credentials
#   CELLAR_KEY_ID, CELLAR_KEY_SECRET - Cellar S3 credentials
#
# Can be run as a cron job on the 1st of each month

set -euo pipefail

# Configuration
ES_HOST="${ES_HOST:-https://bj52epukdycxwrfsecr5-elasticsearch.services.clever-cloud.com}"
ES_USER="${ES_USER:-}"
ES_PASS="${ES_PASS:-}"
CELLAR_HOST="${CELLAR_HOST:-cellar-c2.services.clever-cloud.com}"
CELLAR_BUCKET="${CELLAR_BUCKET:-zlv-logs-archive}"
CELLAR_KEY_ID="${CELLAR_KEY_ID:-}"
CELLAR_KEY_SECRET="${CELLAR_KEY_SECRET:-}"
INDEX_PATTERN="${INDEX_PATTERN:-zlv-logs-*}"
SCROLL_SIZE="${SCROLL_SIZE:-5000}"
SCROLL_TIME="${SCROLL_TIME:-5m}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_dependencies() {
    local missing=()
    for cmd in curl jq gzip aws; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Install with: brew install ${missing[*]}"
        exit 1
    fi
}

# Check required environment variables
check_env_vars() {
    local missing=()

    if [ -z "$ES_USER" ]; then missing+=("ES_USER"); fi
    if [ -z "$ES_PASS" ]; then missing+=("ES_PASS"); fi
    if [ -z "$CELLAR_KEY_ID" ]; then missing+=("CELLAR_KEY_ID"); fi
    if [ -z "$CELLAR_KEY_SECRET" ]; then missing+=("CELLAR_KEY_SECRET"); fi

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required environment variables: ${missing[*]}"
        echo ""
        echo "Set them with:"
        echo "  export ES_USER='your_es_user'"
        echo "  export ES_PASS='your_es_pass'"
        echo "  export CELLAR_KEY_ID='your_cellar_key'"
        echo "  export CELLAR_KEY_SECRET='your_cellar_secret'"
        exit 1
    fi
}

# Parse target month
parse_target_month() {
    if [ $# -gt 0 ]; then
        TARGET_MONTH="$1"
        # Validate format YYYY-MM
        if ! [[ "$TARGET_MONTH" =~ ^[0-9]{4}-[0-9]{2}$ ]]; then
            log_error "Invalid month format. Use YYYY-MM (e.g., 2024-12)"
            exit 1
        fi
        YEAR="${TARGET_MONTH:0:4}"
        MONTH="${TARGET_MONTH:5:2}"
    else
        # Default to previous month
        if [[ "$OSTYPE" == "darwin"* ]]; then
            YEAR=$(date -v-1m +%Y)
            MONTH=$(date -v-1m +%m)
        else
            YEAR=$(date -d "last month" +%Y)
            MONTH=$(date -d "last month" +%m)
        fi
        TARGET_MONTH="${YEAR}-${MONTH}"
    fi

    # Calculate date range
    START_DATE="${YEAR}-${MONTH}-01T00:00:00Z"

    # Calculate end of month
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: get last day of the month
        END_DATE=$(date -j -f "%Y-%m-%d" "${YEAR}-${MONTH}-01" -v+1m -v-1d +%Y-%m-%d)
    else
        # Linux
        END_DATE=$(date -d "${YEAR}-${MONTH}-01 +1 month -1 day" +%Y-%m-%d)
    fi
    END_DATE="${END_DATE}T23:59:59Z"

    log_info "Target month: $TARGET_MONTH"
    log_info "Date range: $START_DATE to $END_DATE"
}

# Export logs using scroll API
export_logs() {
    local output_file="$1"
    local total_docs=0
    local scroll_id=""

    log_info "Starting export from Elasticsearch..."

    # Initial search with scroll
    local response
    response=$(curl -s -X POST "${ES_HOST}/${INDEX_PATTERN}/_search?scroll=${SCROLL_TIME}" \
        -u "${ES_USER}:${ES_PASS}" \
        -H "Content-Type: application/json" \
        -d '{
            "size": '"${SCROLL_SIZE}"',
            "sort": [{"@timestamp": "asc"}],
            "query": {
                "range": {
                    "@timestamp": {
                        "gte": "'"${START_DATE}"'",
                        "lte": "'"${END_DATE}"'"
                    }
                }
            }
        }')

    # Check for errors
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        log_error "Elasticsearch query failed:"
        echo "$response" | jq '.error'
        exit 1
    fi

    # Get total hits
    local total_hits
    total_hits=$(echo "$response" | jq -r '.hits.total.value // .hits.total // 0')
    log_info "Total documents to export: $total_hits"

    if [ "$total_hits" -eq 0 ]; then
        log_warn "No documents found for $TARGET_MONTH"
        return 1
    fi

    # Extract scroll_id and first batch
    scroll_id=$(echo "$response" | jq -r '._scroll_id')
    local hits_count
    hits_count=$(echo "$response" | jq -r '.hits.hits | length')

    # Write first batch
    echo "$response" | jq -c '.hits.hits[]._source' > "$output_file"
    total_docs=$hits_count

    log_info "Exported $total_docs / $total_hits documents..."

    # Continue scrolling
    while [ "$hits_count" -gt 0 ]; do
        response=$(curl -s -X POST "${ES_HOST}/_search/scroll" \
            -u "${ES_USER}:${ES_PASS}" \
            -H "Content-Type: application/json" \
            -d '{
                "scroll": "'"${SCROLL_TIME}"'",
                "scroll_id": "'"${scroll_id}"'"
            }')

        scroll_id=$(echo "$response" | jq -r '._scroll_id')
        hits_count=$(echo "$response" | jq -r '.hits.hits | length')

        if [ "$hits_count" -gt 0 ]; then
            echo "$response" | jq -c '.hits.hits[]._source' >> "$output_file"
            total_docs=$((total_docs + hits_count))

            # Progress update every 50k docs
            if [ $((total_docs % 50000)) -lt $SCROLL_SIZE ]; then
                log_info "Exported $total_docs / $total_hits documents..."
            fi
        fi
    done

    # Clear scroll
    curl -s -X DELETE "${ES_HOST}/_search/scroll" \
        -u "${ES_USER}:${ES_PASS}" \
        -H "Content-Type: application/json" \
        -d '{"scroll_id": "'"${scroll_id}"'"}' > /dev/null

    log_info "Export complete: $total_docs documents"
    return 0
}

# Compress the file
compress_file() {
    local input_file="$1"
    local output_file="${input_file}.gz"

    log_info "Compressing $input_file..."

    gzip -f "$input_file"

    local size_mb
    size_mb=$(du -m "$output_file" | cut -f1)
    log_info "Compressed file size: ${size_mb}MB"

    echo "$output_file"
}

# Upload to Cellar (S3)
upload_to_cellar() {
    local file="$1"
    local filename
    filename=$(basename "$file")
    local s3_path="s3://${CELLAR_BUCKET}/monthly/${YEAR}/${filename}"

    log_info "Uploading to Cellar: $s3_path"

    # Configure AWS CLI for Cellar
    export AWS_ACCESS_KEY_ID="$CELLAR_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$CELLAR_KEY_SECRET"

    aws s3 cp "$file" "$s3_path" \
        --endpoint-url "https://${CELLAR_HOST}" \
        --no-progress

    if [ $? -eq 0 ]; then
        log_info "Upload successful!"

        # Verify upload
        local remote_size
        remote_size=$(aws s3 ls "$s3_path" \
            --endpoint-url "https://${CELLAR_HOST}" | awk '{print $3}')
        local local_size
        local_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")

        if [ "$remote_size" = "$local_size" ]; then
            log_info "Size verification OK: $remote_size bytes"
        else
            log_warn "Size mismatch! Local: $local_size, Remote: $remote_size"
        fi
    else
        log_error "Upload failed!"
        exit 1
    fi
}

# Cleanup temporary files
cleanup() {
    local file="$1"
    if [ -f "$file" ]; then
        rm -f "$file"
        log_info "Cleaned up temporary file: $file"
    fi
}

# Main
main() {
    log_info "=== ZLV Monthly Logs Export ==="

    check_dependencies
    check_env_vars
    parse_target_month "$@"

    local work_dir
    work_dir=$(mktemp -d)
    local json_file="${work_dir}/zlv-logs-${TARGET_MONTH}.json"

    trap "rm -rf $work_dir" EXIT

    if export_logs "$json_file"; then
        local gz_file
        gz_file=$(compress_file "$json_file")
        upload_to_cellar "$gz_file"

        log_info "=== Export Complete ==="
        log_info "File: zlv-logs-${TARGET_MONTH}.json.gz"
        log_info "Location: s3://${CELLAR_BUCKET}/monthly/${YEAR}/"
    else
        log_warn "No logs to export for $TARGET_MONTH"
    fi
}

main "$@"
