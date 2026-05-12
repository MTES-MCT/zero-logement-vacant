---
description: Add a new external/raw table to the ZLV warehouse (PM-friendly flow). Wraps the external-source-onboarding skill and opens a PR.
argument-hint: <description-or-url> [producer]
---

# /pm-add-raw-table

You are a senior data engineer helping a Product Manager add a **new raw external
table** to the ZLV warehouse. The PM may give you:

- a URL (data.gouv.fr / INSEE / etc.)
- or just a description ("table CEREMA 2026 des transactions immobilières")

Argument: `$ARGUMENTS`

## What you must do

1. **Clarify briefly** if needed:
   - direct download URL (must return HTTP 200 — verify with `curl -I`)
   - producer (INSEE, DGFIP, DGALN, CEREMA, URSSAF, data.gouv.fr, …)
   - file type (parquet / csv / xlsx)
   - desired short source name (snake_case, e.g. `cerema_dvf_2026`)
   - refresh cadence (yearly / on-demand)
   Ask at most 2 questions. If the PM gave enough, proceed.

2. **Create a feature branch**: `feat/analytics-raw-<source_name>`.

3. **Delegate the actual work to the `external-source-onboarding` skill and the
   `data-engineer` subagent.** Do not write Python/SQL inline — invoke them.
   The skill (in `.claude/skills/external-source-onboarding/SKILL.md`) lists
   the 6-step canonical flow. Follow it exactly.

   Required outputs of the delegated work:
   - new entry in `analytics/dagster/src/assets/dwh/ingest/queries/external_sources_config.py`
   - new `analytics/dbt/models/staging/<domain>/sources/<producer>.yml`
   - new `analytics/dbt/models/staging/<domain>/stg_<producer>__<table>.sql`
   - **`schema.yml` entry with at least one test** (`unique` + `not_null` on the
     primary key, or `dbt_utils.unique_combination_of_columns` for composite PKs).
     This is non-negotiable — CI gate `dbt-test-coverage.yml` will reject the
     PR otherwise.
   - `analytics/dagster/DATA_SOURCES_CATALOG.md` updated

4. **Verify locally before pushing** (delegate to the subagent):
   ```bash
   cd analytics/dagster
   uv run python src/assets/dwh/ingest/validate_sources.py <source_name> --test-loading
   cd ../dbt
   dbt parse
   dbt compile --select stg_<producer>__<table>
   ```

5. **Open the PR** with `gh pr create`. PR title: `feat(analytics): add raw
   table <source_name>`. PR body must include:
   - what the source contains (1-2 lines for non-data audience)
   - URL or S3 path
   - producer + cadence
   - reviewer hint: `cc @raphaelcourivaud` (or current data owner)
   - **how to materialize after merge**: link to GH Actions workflow
     `dagster-rerun.yml` with `mode=asset target=<source_name>`

6. **Stop and hand off** — do not merge. The PR is the deliverable.

## Guardrails

- Never commit secrets (Cellar keys, MD_TOKEN). They live in GH Actions secrets.
- Never write to MotherDuck directly from this session — only through the PR +
  GH Actions flow.
- If the URL returns 403 or requires auth, propose mirroring to S3 Cellar and
  stop for explicit confirmation.
