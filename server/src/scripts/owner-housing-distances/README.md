# Owner-Housing Location Calculator

Calculates the relative location of an owner to a housing unit and writes the
result to `owners_housing`:

- `locprop_relative_ban`: application classification used by filters and exports.
- `locprop_distance_ban`: distance in meters when both BAN addresses have coordinates.

This script is designed as a scoped LOVAC post-process. Do not use it as an
unbounded production backfill.

The canonical implementation is packaged under
`analytics/dagster/src/owner_housing_locations`. The Python files in this
directory are compatibility entrypoints, so the documented CLI remains
available from the server scripts directory.

## Classification Values

| Value | Meaning                              |
| ----- | ------------------------------------ |
| `0`   | Same address                         |
| `1`   | Same commune                         |
| `2`   | Same department                      |
| `3`   | Same region                          |
| `4`   | Owner in another metropolitan region |
| `5`   | Owner overseas                       |
| `6`   | Owner abroad                         |
| `7`   | Missing or unclassified information  |

`locprop_distance_ban` can remain `NULL` legitimately when coordinates are
missing. For this reason, default candidate selection is based on
`locprop_relative_ban IS NULL`, not on the distance column.

## Safety Rules

- `--data-file-year` is mandatory, for example `lovac-2026`.
- `--establishment-id` or one or more `--geo-code` values are required by
  default. A whole-year run requires the explicit `--allow-full-year` flag.
- `--dry-run` processes data and prints counters without writing.
- `--num-workers` defaults to `1`; increase only after a small successful pilot.
- `--limit` is deterministic and uses keyset pagination; it does not use
  `ORDER BY RANDOM()`.
- `--force` recalculates existing values inside the selected scope.
- Any address-loading or database-write failure aborts the run. Failed batches
  are never converted into classification `7`.

Country detection is intentionally conservative. BAN geocoding is the source of
authority for French addresses: when a `ban_addresses` row has coordinates, the
script treats it as France and applies the French geographic rules. Text without
coordinates is only used to detect explicit countries:

- explicit foreign country -> `6`;
- explicit France or French overseas territory -> French geographic rules;
- no explicit country -> `7`.

Postal codes, city names, street types, accents, departments, and
French-looking words are not enough to classify an address as France. For
example, `38200 VIENNE`, `10115 Berlin`, and `10115 Avenue Berlin` remain
unclassified without BAN coordinates or an explicit country.

## CLI Usage

Run from this directory or pass the script path explicitly.

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Dry-run for a few communes
python calculate_distances.py \
  --data-file-year lovac-2026 \
  --geo-code 38200 \
  --geo-code 38544 \
  --dry-run \
  --limit 500

# Dry-run for one establishment
python calculate_distances.py \
  --data-file-year lovac-2026 \
  --establishment-id "00000000-0000-0000-0000-000000000000" \
  --dry-run

# Write a targeted correction after reviewing the dry-run counters
python calculate_distances.py \
  --data-file-year lovac-2026 \
  --establishment-id "00000000-0000-0000-0000-000000000000" \
  --num-workers 1

# Recalculate existing values in the same scope
python calculate_distances.py \
  --data-file-year lovac-2026 \
  --establishment-id "00000000-0000-0000-0000-000000000000" \
  --force \
  --num-workers 1

# Full-year runs require an explicit opt-in
python calculate_distances.py \
  --data-file-year lovac-2026 \
  --allow-full-year \
  --dry-run
```

Parameters:

| Parameter            | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `--db-url`           | PostgreSQL URL. Defaults to `DATABASE_URL`.                  |
| `--data-file-year`   | Required LOVAC cohort, for example `lovac-2026`.             |
| `--establishment-id` | Optional establishment UUID. Uses its `localities_geo_code`. |
| `--geo-code`         | Optional INSEE commune code. Can be repeated.                |
| `--allow-full-year`  | Explicitly allows an unscoped whole-cohort run.              |
| `--dry-run`          | Computes counters without updating `owners_housing`.         |
| `--limit`            | Stops after N owner-housing pairs.                           |
| `--force`            | Recalculates existing rows in the selected scope.            |
| `--batch-size`       | Number of pairs fetched per DB batch. Default: `50000`.      |
| `--num-workers`      | Parallel DB update workers. Default: `1`.                    |

## Dagster Usage

The preferred production entry point is the Dagster job
`lovac_post_import_enrichment`.

The job contains three assets:

- `lovac_owner_ban_backfill`: optional owner BAN geocoding backfill. Dry-run
  skips writes by default.
- `lovac_owner_housing_locations`: runs this calculator.
- `lovac_owner_housing_location_quality_check`: checks coverage of
  usable `locprop_relative_ban` classifications (`0` through `6`) and reports
  unresolved class `7` or BAN sentinel rows separately.

Example run config for a targeted dry-run:

```yaml
ops:
  lovac_owner_ban_backfill:
    config:
      data_file_year: lovac-2026
      establishment_id: '00000000-0000-0000-0000-000000000000'
      dry_run: true
  lovac_owner_housing_locations:
    config:
      data_file_year: lovac-2026
      establishment_id: '00000000-0000-0000-0000-000000000000'
      dry_run: true
      limit: 500
      num_workers: 1
  lovac_owner_housing_location_quality_check:
    config:
      data_file_year: lovac-2026
      establishment_id: '00000000-0000-0000-0000-000000000000'
      min_coverage_ratio: 0.95
      fail_on_low_coverage: false
```

For a real targeted correction, set `dry_run: false` only on
`lovac_owner_housing_locations` after a successful dry-run. Keep
`num_workers: 1` for the first write run.

## Pre-Run SQL Checks

Use these checks before and after a run. Replace the cohort and scope filter.

```sql
SELECT
  COUNT(*) AS total_pairs,
  COUNT(*) FILTER (WHERE oh.locprop_relative_ban IS NULL) AS missing_relative,
  COUNT(*) FILTER (WHERE oh.locprop_relative_ban IS NOT NULL) AS classified,
  COUNT(*) FILTER (WHERE oba.ref_id IS NULL) AS missing_owner_ban,
  COUNT(*) FILTER (WHERE hba.ref_id IS NULL) AS missing_housing_ban
FROM owners_housing oh
JOIN fast_housing h
  ON h.id = oh.housing_id
 AND h.geo_code = oh.housing_geo_code
LEFT JOIN ban_addresses oba
  ON oba.ref_id = oh.owner_id
 AND oba.address_kind = 'Owner'
LEFT JOIN ban_addresses hba
  ON hba.ref_id = oh.housing_id
 AND hba.address_kind = 'Housing'
WHERE oh.rank >= 1
  AND h.data_file_years @> ARRAY['lovac-2026']::text[]
  AND h.geo_code = ANY(ARRAY['38200']::text[]);
```

## Required Indexes

The migration
`server/src/infra/database/migrations/20260625130000_owner-housing-location-postprocess-indexes.ts`
adds:

- one `data_file_years` GIN index on every existing `fast_housing` partition;
- `idx_owners_housing_distances` partial index on
  `(owner_id, housing_id, housing_geo_code)` where `rank >= 1` and
  `locprop_relative_ban IS NULL`.

Run migrations before a production write.

## Test Procedure

1. Run unit tests:

   ```bash
   pytest test_calculate_distances.py -q
   ```

2. Run a local or staging dry-run with `--limit`.

3. Compare pre-run SQL counters with the dry-run report.

4. Run a small write pilot with `--limit` and `--num-workers 1`.

5. Re-run the SQL counters and verify that `missing_relative` decreased.

6. Run the full targeted scope only after the pilot is correct.
