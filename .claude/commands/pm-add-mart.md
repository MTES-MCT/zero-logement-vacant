---
description: Add or modify a Marts table in Metabase (PM-friendly flow). Wraps the dbt-model skill and opens a PR with mandatory tests.
argument-hint: <mart-name-or-description>
---

# /pm-add-mart

You are a senior analytics engineer helping a Product Manager add or modify a
**Marts table** for Metabase. The PM may give you a short description
("table mensuelle des sorties de vacance par EPCI") or a draft mart name.

Argument: `$ARGUMENTS`

## What you must do

1. **Clarify briefly** if needed (max 2 questions):
   - final mart name in snake_case, prefixed `marts_<domain>_<entity>`
     (domain ∈ `production`, `analysis`, `stats`, `common`)
   - grain (one row per …?)
   - upstream models or sources used
   - KPI columns the PM wants visible in Metabase
   If the PM gave enough, proceed.

2. **Explore current data shape first** using the MotherDuck MCP
   (`mcp__MotherDuck__list_columns`, `mcp__MotherDuck__query`). Never invent
   columns. Verify upstream models exist in `dwh.main_int.*` or `dwh.main_marts.*`.

3. **Create a feature branch**: `feat/analytics-mart-<short_name>`.

4. **Delegate to the `dbt-model` skill and the `analytics-engineer` subagent.**
   The skill is at `.claude/skills/dbt-model/SKILL.md`. Follow it exactly.

   Required outputs of the delegated work:
   - `analytics/dbt/models/marts/<domain>/marts_<domain>_<entity>.sql`
     (materialized `table`, uses `{{ ref(...) }}` exclusively)
   - **`schema.yml` entry with description + at least one test on the PK**
     (`unique` + `not_null` for single-column PK, or
     `dbt_utils.unique_combination_of_columns` for composite). Non-negotiable —
     CI gate `dbt-test-coverage.yml` rejects PRs with untested models.
   - Column descriptions for every business-meaningful column (Metabase reads them).
   - If the mart touches `marts_stats_monthly_global` lineage, run regression
     tests under `tests/production/stats/` and surface deltas in the PR body.

5. **Verify before pushing**:
   ```bash
   cd analytics/dbt
   dbt deps
   dbt parse
   dbt compile --select marts_<domain>_<entity>
   dbt run --select +marts_<domain>_<entity>      # only if PM has MD token locally
   dbt test --select marts_<domain>_<entity>
   ```
   If MD token is not available locally, skip the `run`/`test` steps and note
   in the PR that CI + the post-merge Dagster job will validate.

6. **Open the PR** with `gh pr create`. PR title: `feat(analytics): add mart
   marts_<domain>_<entity>` (or `fix:` / `refactor:` if modifying). PR body:
   - what the table represents (1-2 lines, non-technical)
   - grain ("one row per …")
   - upstream models
   - tests added
   - **how to refresh after merge**: link `dagster-rerun.yml` with
     `mode=asset target=+marts_<domain>_<entity>`

7. **Stop and hand off** — do not merge.

## Guardrails

- Never use raw table names — only `{{ ref() }}` / `{{ source() }}`.
- Never change a model's materialization without a paragraph of justification.
- If the mart is large (>50 columns), put descriptions in `schema.yml`, not as
  SQL comments.
- If a related KPI changes by >5% in regression tests, flag it as
  `⚠️ KPI delta` in the PR body and wait for review.
