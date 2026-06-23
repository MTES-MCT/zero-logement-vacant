# Context — BAN backfill scripts

Glossary for the one-shot BAN geocoding backfill scripts in this directory.

## Owner cohort

The import batch an **owner record** came from. Stored as the scalar
`owners.data_source` (e.g. `lovac-2026`, `lovac-2025`). One value per owner row.
This is what `backfill_ban_owners.py --data-source` filters on.

## LOVAC housing membership

Whether a **housing** appears in a given yearly LOVAC file. Stored as the array
`fast_housing.data_file_years` (`text[]`); a housing "is in LOVAC 2026" when
`'lovac-2026' = ANY(data_file_years)`. A housing can belong to several years.

This is **not** a `data_source` — it is array containment, and it lives on
housing, not owners. Do not conflate it with [owner cohort](#owner-cohort).

## Owner of a LOVAC-2026 housing

An owner linked through `owners_housing(owner_id, housing_id)` to at least one
housing that has [LOVAC 2026 membership](#lovac-housing-membership). Independent
of that owner's own [cohort](#owner-cohort): an owner imported as `lovac-2025`
is still an "owner of a LOVAC-2026 housing" if any of their housings carries
`lovac-2026`. This is the set the new backfill mode geocodes.
