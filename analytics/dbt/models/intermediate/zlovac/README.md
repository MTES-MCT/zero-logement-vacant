# ZLOVAC Pipeline Documentation

## Overview

The ZLOVAC pipeline transforms LOVAC 2026 data into four normalized export tables for the ZLV application. It takes raw CEREMA LOVAC data and produces housing, owners, owner-housing relationships, and building tables.

## Pipeline Architecture

```
                        cerema_lovac_2026_raw (source)
                                │
                                ▼
                        stg_lovac_2026
                    (staging: clean + dedup by local_id)
                                │
                                ▼
                        int_lovac_fil_2026
                    (dedup + business filters)
                                │
                                ▼
                          int_zlovac
                    (field mapping, no filtering)
                       ┌────┬────┴────┬──────────┐
                       │    │         │          │
                       ▼    ▼         ▼          ▼
              housing  │  scored    unique     buildings
                       │  owners   owners
                       │    │         │
                       │    ▼         ▼
                       │  owner     owners
                       │  housing  (dedup by idpersonne)
                       │    │
                       ▼    ▼
                    EXPORTED AS JSONL TO S3
```

## Models

### int_zlovac

**Source:** `int_lovac_fil_2026`
**Materialization:** view
**Row guarantee:** 1:1 with `int_lovac_fil_2026` (no filtering, no grouping)

Maps raw LOVAC/FF column names to standardized ZLV column names. Includes:
- Housing identification (invariant, local_id, building_id, plot_id)
- Address and geolocation (DGFIP address, BAN coordinates, FF coordinates)
- Geolocation priority: RNB > FF > BAN
- Housing characteristics (classification, rooms, area, building year)
- Vacancy and taxation info
- 1767-source owner (proprietaire)
- FF owners 1-6 (fullname, address, birth date, postal code, etc.)

### int_zlovac_housing

**Source:** `int_zlovac`
**Materialization:** view
**Row guarantee:** 1:1 with `int_zlovac` (no filtering)
**Exported as:** `zff_housings.jsonl`

Gold housing table. Selects a subset of columns from `int_zlovac` relevant for housing export:
- Identification: invariant, local_id, building_id
- Location: dgfip_address, geo_code, coordinates
- Characteristics: classification, rooms, area, building year, vacancy start
- Mutation/transaction history

**All housing records from int_lovac_fil_2026 are present**, including those without owners.

### int_zlovac_owner_housing_scored

**Source:** `int_zlovac`
**Materialization:** view

Unpivots the 6 FF owner columns per housing into individual rows and scores each owner-housing pair for match quality against the 1767 proprietaire.

**Scoring logic (simplified fuzzy matching):**

| Score | Condition |
|-------|-----------|
| 10 | Match fullname + raw address |
| 9 | Match fullname + postal code |
| 8 | Match fullname only |
| 7 | Match first name + raw address |
| 6 | Match first name + postal code |
| 5 | Match first name only |
| 2 | No match + mutation in last 2 years |
| 1 | No match + no recent mutation |

**Housing without any FF owner** is preserved as a row with `rank = 0` and all NULL owner fields (lines 137-160).

After scoring, owners are re-ranked per housing by descending score using `ROW_NUMBER() OVER (PARTITION BY local_id ORDER BY adjusted_owner_score DESC)`.

### int_zlovac_owner_housing

**Source:** `int_zlovac_owner_housing_scored` LEFT JOIN `int_zlovac`
**Materialization:** view
**Exported as:** `zff_owner_housing.jsonl`

Join table between owners and housing. Uses LEFT JOIN to preserve all scored rows including housing without owners.

Columns: idprodroit, idpersonne, local_id, property_rights, geo_code, idprocpte, rank, locprop_source.

### int_zlovac_unique_owners

**Source:** `int_zlovac` (via macro `unique_users_handling_zlovac`)
**Materialization:** view

Unpivots FF owners 1-6 into individual rows using `UNION DISTINCT` of 6 macro calls. Each macro call:
1. Selects owner fields from the corresponding `ff_owner_N_*` columns
2. Filters with `WHERE ff_owner_N_fullname IS NOT NULL`

This means only owners with a non-null fullname are included.

### int_zlovac_owners

**Source:** `int_zlovac_unique_owners`
**Materialization:** view
**Exported as:** `zff_owners.jsonl`

Gold owners table. Applies `DISTINCT ON (owner_idpersonne)` to deduplicate owners to one row per unique idpersonne.

**Note:** The `DISTINCT ON` has no explicit `ORDER BY`, so which row is kept per idpersonne is non-deterministic. In practice this is acceptable because the same owner's attributes should be consistent across their different housing records.

### int_zlovac_buildings

**Source:** `int_zlovac`
**Materialization:** view
**Exported as:** `zff_buildings.jsonl`

One row per unique building_id. Includes RNB (Referentiel National des Batiments) enrichment:
- rnb_id, rnb_id_score, rnb_footprint

Filters: `WHERE building_id IS NOT NULL` (excludes housing without a building reference).

### int_zlovac_evol_housing_owners

**Source:** `int_lovac_fil_2026` FULL OUTER JOIN `int_lovac_fil_2025`
**Materialization:** table

Tracks ownership changes between LOVAC 2025 and 2026. Detects:
- `new_in_2026`: housing present in 2026 but not 2025
- `gone_in_2026`: housing present in 2025 but not 2026
- `account_change`: different idprocpte between years
- `ownership_order_change`: same idprocpte but different set of idprodrois

Not exported. Used for analytical purposes.

### int_zlovac_owners_rematched

**Source:** `int_zlovac` INNER JOIN `stg_ff_owners_2024`
**Materialization:** view

Matches ZLOVAC owners to FF 2024 owners based on exact fullname + address match. Used for cross-referencing, not part of the main export pipeline.

## Upstream Filters (int_lovac_fil_2026)

Before entering the ZLOVAC pipeline, `int_lovac_fil_2026` applies these business filters:

| Filter | Purpose |
|--------|---------|
| `vacancy_start_year < data_year - 2` | Only housing vacant for 2+ years |
| `groupe NOT IN (1,2,3,4,5,6,9) OR NULL` | Exclude public/institutional owners |
| `aff = 'H'` | Only habitation (not commercial) |
| `housing_kind IN ('APPART', 'MAISON')` | Only apartments and houses |
| `local_id IS NOT NULL` | Exclude records without a local ID |

Plus deduplication: one row per `local_id` (by vacancy_start_year DESC, anmutation DESC, etc.).

## Data Integrity Guarantees

| Assertion | Status |
|-----------|--------|
| Every row in `int_lovac_fil_2026` is in `int_zlovac` | Yes (no filtering) |
| Every row in `int_zlovac` is in `int_zlovac_housing` | Yes (no filtering) |
| Housing without FF owners preserved in housing table | Yes |
| Housing without FF owners preserved in owner_housing | Yes (rank=0, NULL owner fields) |
| Every FF owner with non-null fullname is in owners table | Yes (UNION DISTINCT of 6 slots) |
| Each owner has unique idpersonne in owners table | Yes (DISTINCT ON) |
| owner_housing correctly links owners to housing | Yes (LEFT JOIN preserves all scored rows) |

## Export Workflow

The GitHub Actions workflow `.github/workflows/export-zlovac.yml`:

1. **Trigger:** Manual only (`workflow_dispatch`)
2. **Rebuilds models** (optional, default true): runs `dbt run --select "stg_zlovac+ int_zlovac+ int_zlovac_housing int_zlovac_owners int_zlovac_owner_housing int_zlovac_buildings"`
3. **Exports 4 JSONL files** to S3 via DuckDB CLI:
   - `zff_housings.jsonl` from `main_int.int_zlovac_housing`
   - `zff_owners.jsonl` from `main_int.int_zlovac_owners`
   - `zff_owner_housing.jsonl` from `main_int.int_zlovac_owner_housing`
   - `zff_buildings.jsonl` from `main_int.int_zlovac_buildings`
