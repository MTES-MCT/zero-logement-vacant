# LOVAC Post-Import Enrichment

This document explains how to run the owner-housing relative-location
post-process after a LOVAC import.

The Dagster job is `lovac_post_import_enrichment`.

It runs three assets:

1. `lovac_owner_ban_backfill`: optional BAN backfill for owners linked to the
   LOVAC cohort. It is skipped when `dry_run: true`.
2. `lovac_owner_housing_locations`: calculates
   `owners_housing.locprop_relative_ban` and `locprop_distance_ban`.
3. `lovac_owner_housing_location_quality_check`: verifies coverage of
   `locprop_relative_ban`.

## Before Running

Run database migrations first. The post-process depends on the indexes added by:

```text
server/src/infra/database/migrations/20260625130000_owner-housing-location-postprocess-indexes.ts
```

Then find the establishment id or the commune codes for the target scope:

```sql
SELECT id, name, localities_geo_code
FROM establishments
WHERE unaccent(lower(name)) LIKE unaccent('%vienne%condrieu%');
```

If the establishment query is not available, use explicit `geo_codes` in the
Dagster config.

## Start Dagster Locally

From `analytics/dagster`:

```bash
uv sync
dagster dev
```

Open the Dagster UI, select the job `lovac_post_import_enrichment`, then use the
Launchpad config below.

## Targeted Dry-Run

Use this first. It performs no writes in the BAN backfill and no writes in the
owner-housing calculation.

```yaml
ops:
  lovac_owner_ban_backfill:
    config:
      data_file_year: lovac-2026
      dry_run: true
  lovac_owner_housing_locations:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      dry_run: true
      limit: 500
      num_workers: 1
  lovac_owner_housing_location_quality_check:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      min_coverage_ratio: 0.95
      fail_on_low_coverage: false
```

Variant with commune codes:

```yaml
ops:
  lovac_owner_ban_backfill:
    config:
      data_file_year: lovac-2026
      dry_run: true
  lovac_owner_housing_locations:
    config:
      data_file_year: lovac-2026
      geo_codes: ["38200"]
      dry_run: true
      limit: 500
      num_workers: 1
  lovac_owner_housing_location_quality_check:
    config:
      data_file_year: lovac-2026
      geo_codes: ["38200"]
      min_coverage_ratio: 0.95
      fail_on_low_coverage: false
```

Expected dry-run checks:

- `candidate_count` is close to the SQL count of rows with
  `locprop_relative_ban IS NULL` in the same scope.
- `updates_prepared` equals the number of processed pairs.
- `updated_pairs` is `0`.
- `classification_counts` contains non-zero values for the expected categories.

## Write Pilot

After the dry-run, run a small write pilot:

```yaml
ops:
  lovac_owner_ban_backfill:
    config:
      data_file_year: lovac-2026
      dry_run: true
  lovac_owner_housing_locations:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      dry_run: false
      limit: 500
      num_workers: 1
  lovac_owner_housing_location_quality_check:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      min_coverage_ratio: 0.1
      fail_on_low_coverage: false
```

The low threshold is intentional for the pilot because only 500 pairs are
updated. After the pilot, verify that `missing_relative` decreased.

## Full Targeted Run

Remove `limit` only after the pilot is correct:

```yaml
ops:
  lovac_owner_ban_backfill:
    config:
      data_file_year: lovac-2026
      dry_run: true
  lovac_owner_housing_locations:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      dry_run: false
      limit: 0
      num_workers: 1
  lovac_owner_housing_location_quality_check:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      min_coverage_ratio: 0.95
      fail_on_low_coverage: true
```

Keep `num_workers: 1` for the first production correction. Increase only if the
query plan and database load are acceptable.

## Owner BAN Backfill

If the dry-run report or the quality check shows many missing owner BAN rows,
run the owner BAN backfill separately as a limited pilot:

```yaml
ops:
  lovac_owner_ban_backfill:
    config:
      data_file_year: lovac-2026
      dry_run: false
      limit: 5000
      workers: 2
      chunk: 500
      fetch_batch: 20000
  lovac_owner_housing_locations:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      dry_run: true
      limit: 500
      num_workers: 1
  lovac_owner_housing_location_quality_check:
    config:
      data_file_year: lovac-2026
      establishment_id: "<establishment_uuid>"
      min_coverage_ratio: 0.95
      fail_on_low_coverage: false
```

For a full-year owner BAN backfill, set `allow_full_year: true`. Do that only as
a planned operation because it can geocode many owners:

```yaml
ops:
  lovac_owner_ban_backfill:
    config:
      data_file_year: lovac-2026
      dry_run: false
      allow_full_year: true
      limit: 0
      workers: 2
```

## Post-Import Standard Procedure

After each annual LOVAC import:

1. Import owners, housings, and housing owners.
2. Run the `lovac_post_import_enrichment` dry-run on a small scope.
3. Run a write pilot with `limit`.
4. Run the full targeted or full-year enrichment.
5. Keep the quality-check materialization with the import report.

The long-term goal is to make this job the post-process step after
`housing-owners` import, once the annual procedure has been validated on one
millésime.
