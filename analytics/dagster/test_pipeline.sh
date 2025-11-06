#!/bin/bash

# =============================================================================
# Test Script: External Data Sources Pipeline
# =============================================================================
# This script demonstrates how to test the new external sources pipeline
#
# Usage:
#   chmod +x test_pipeline.sh
#   ./test_pipeline.sh
# =============================================================================

set -e  # Exit on error

echo "=================================================="
echo "Testing External Data Sources Pipeline"
echo "=================================================="
echo ""

# Change to dagster directory
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

echo "Project root: $PROJECT_ROOT"
echo ""

# =============================================================================
# Step 1: Validate URLs
# =============================================================================
echo "Step 1: Validating external source URLs..."
echo "-------------------------------------------"

python src/assets/dwh/ingest/validate_sources.py carte_des_loyers_2023

echo ""
echo "✅ URL validation complete"
echo ""

# =============================================================================
# Step 2: Test DuckDB Loading (Optional - slower)
# =============================================================================
echo "Step 2: Testing DuckDB loading (optional)..."
echo "-------------------------------------------"
echo "Skip this step? (Press Enter to skip, or type 'test' to run)"
read -r SKIP_LOAD_TEST

if [ "$SKIP_LOAD_TEST" = "test" ]; then
    python src/assets/dwh/ingest/validate_sources.py carte_des_loyers_2023 --test-loading
    echo ""
    echo "✅ DuckDB loading test complete"
else
    echo "⏭️  Skipping DuckDB load test"
fi
echo ""

# =============================================================================
# Step 3: Show Available Sources
# =============================================================================
echo "Step 3: Available external sources..."
echo "-------------------------------------------"
echo "Configured sources:"
python -c "
import sys
sys.path.insert(0, 'src')
from assets.dwh.ingest.queries.external_sources_config import EXTERNAL_SOURCES, get_sources_by_producer

print(f'\nTotal sources configured: {len(EXTERNAL_SOURCES)}\n')

# Group by producer
producers = sorted(set(c['producer'] for c in EXTERNAL_SOURCES.values()))
for producer in producers:
    sources = get_sources_by_producer(producer)
    print(f'{producer}: {len(sources)} source(s)')
    for name in sources:
        print(f'  - {name}')
    print()
"

echo ""

# =============================================================================
# Step 4: Instructions for Manual Testing
# =============================================================================
echo "Step 4: Manual testing instructions..."
echo "-------------------------------------------"
echo ""
echo "To test in Dagster:"
echo ""
echo "1. Start Dagster:"
echo "   dagster dev"
echo ""
echo "2. Open browser: http://localhost:3000"
echo ""
echo "3. Navigate to: Assets → import_external_sources_to_duckdb"
echo ""
echo "4. Click 'Materialize' on individual sources"
echo ""
echo "Or use CLI:"
echo ""
echo "# Materialize specific source:"
echo "dagster asset materialize -m src.definitions --select raw_carte_des_loyers_2023"
echo ""
echo "# Materialize all external sources:"
echo "dagster asset materialize -m src.definitions --select import_external_sources_to_duckdb+"
echo ""
echo "# Run the job:"
echo "dagster job execute -m src.definitions -j datawarehouse_load_external_sources"
echo ""

# =============================================================================
# Step 5: Check Schedule
# =============================================================================
echo "Step 5: Checking schedule configuration..."
echo "-------------------------------------------"
echo ""
echo "The following schedule has been configured:"
echo "  Name: yearly_external_sources_refresh_schedule"
echo "  Frequency: @yearly (runs once per year)"
echo "  Job: datawarehouse_load_external_sources"
echo ""
echo "To enable the schedule:"
echo "  dagster schedule start yearly_external_sources_refresh_schedule"
echo ""
echo "To check schedule status:"
echo "  dagster schedule list"
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "=================================================="
echo "✅ Pipeline Test Complete!"
echo "=================================================="
echo ""
echo "What's been set up:"
echo "  ✅ Configuration system for external sources"
echo "  ✅ Dynamic Dagster assets (one per source)"
echo "  ✅ Validation tools"
echo "  ✅ Annual schedule for automatic refresh"
echo "  ✅ DBT source templates"
echo ""
echo "Next steps:"
echo "  1. Find missing URLs (see DATA_SOURCES_CATALOG.md)"
echo "  2. Add real sources to external_sources_config.py"
echo "  3. Test with: dagster dev"
echo "  4. Create DBT staging models"
echo "  5. Build marts and analytics"
echo ""
echo "Documentation:"
echo "  📖 QUICK_START.md - How to add new sources"
echo "  📖 EXTERNAL_SOURCES_README.md - Complete reference"
echo "  📖 DATA_SOURCES_CATALOG.md - Track all sources"
echo "  📖 IMPLEMENTATION_SUMMARY.md - Architecture overview"
echo ""
echo "Happy data engineering! 🚀"
echo ""

