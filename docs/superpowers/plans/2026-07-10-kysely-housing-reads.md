# Kysely Migration — housingRepository Reads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:tdd` (behaviour-preserving refactor under the existing characterization tests — housingRepository is the best-covered big file, ~89% branch, so the safety net is strong) and `superpowers:subagent-driven-development` for the filter/include fan-out. Steps use checkbox (`- [ ]`) syntax.

**Date:** 2026-07-10
**Base:** stack on the mega-cluster branch `feat/kysely-migrate-housing-owner-cluster` (#1903) — housing **writes** are already Kysely there; this migrates the **reads** on top. Cherry-pick the nested-JSON fix `466b4ec4e` if not already inherited (`CamelCasePlugin({ maintainNestedObjectKeys: true })`).

## Why this is the enabler (do it before owner/housingOwner reads)

`parseHousingRecordApi` and the housing query patterns live here. These are **blocked on this migration**:
- `ownerRepository.find({ includes: ['housings'] })` (housingExportController) and `ownerRepository.findByHousing`
- `housingOwnerRepository.findByOwner`

They join `fast_housing` and feed `parseHousingRecordApi`; until housing reads are camelCase-native, those can't migrate cleanly. Finish this first, then they follow.

## Scope

Migrate the **read** path of `server/src/repositories/housingRepository.ts` to Kysely:
- [ ] `find` (paginated), `findOne`, `stream` (cursor), `count`.
- [ ] the shared `fastListQuery`/`listQuery`, `include(includes, filters)`, `filterQuery`, `housingSortQuery`, `paginate`.
- [ ] `parseHousingApi` → add a camelCase `parseHousingRow` (keep `parseHousingApi`/`parseHousingRecordApi` snake_case for seeds, LOVAC, and the still-Knex reads elsewhere).

Writes (`save`/`saveMany`/`update`/`updateMany`/`remove`) are already Kysely (#1903) — do not touch. Keep the full Knex export surface (`Housing` accessor, `HousingRecordDBO`/`HousingDBO`, `formatHousingRecordApi`, `parseHousingRecordApi`, `ownerHousingJoinClause`, table constants).

## The hard parts (sized)

1. **`filterQuery` is enormous** — ~114 `where`/`whereRaw`/`cardinality`/`to_tsquery` conditions (housing status/occupancy/kind/energy, `data_file_years` cardinality, campaign/group/precision/perimeter membership subqueries, geo perimeter, vacancy, full-text, ...). This is the dominant effort. Reproduce each as Kysely `where`/`sql`; group by filter key. **Consider a subagent per filter-family** (status/occupancy, dates/energy, membership-subqueries, geo/text) with a strict characterization test per family before/after.
2. **`include(includes, filters)`** — 4 variants, each a `leftJoin` + JSON:
   - `owner`: `leftJoin housing_owners` (via `ownerHousingJoinClause` — rank/geo pair) `+ leftJoin owners` → `to_json(owners.*) AS owner`; **plus** `leftJoin ban_addresses` → `to_json(ban.*) AS owner_ban_address`.
   - `campaigns`: `leftJoin` + `campaign_ids` array (`cardinality`).
   - `perimeters`: correlated `json_agg(distinct kind) AS perimeter_kind`.
   - `precisions`: correlated `json_agg(precisions.*) AS precisions`.
   Reproduce each as raw `sql` correlated subqueries (snake_case keys — the nested-JSON fix keeps them snake_case for the parsers). `owner` embeds a `User/owner` DBO consumed by `parseHousingApi`.
3. **`stream` uses Knex `.stream()` → `Readable.toWeb`.** Kysely streams via `.stream()` on the postgres dialect (server-side cursor). Port to `kysely.selectFrom(...).stream()` (async iterable) → wrap into a `ReadableStream<HousingApi>`. **Verify cursor + pool behaviour under the bridge**; keep `parseHousingApi` mapping.
4. **`parseHousingApi`** (large) — build `parseHousingRow` from the camelCase row: `parseHousingRecordApi`-equivalent columns + `owner`/`owner_ban_address`/`campaigns`/`perimeter_kind`/`precisions`. Watch `geolocation` (PostGIS geometry typed `string`), `Timestamp→Date`, and the READ_ONLY columns.
5. **Pagination** — reproduce `paginate` (limit/offset) in Kysely; `count` becomes `select count(*)` over the filtered query (mind the `distinct` if joins fan out).

## Blast radius — verify broadly

**31 call sites across 10+ files.** After migration, run at minimum:
- `housingRepository.test.ts` (168 tests — the primary net)
- `housing-api`, `campaign-api`, `group-api`, `owner-api`, `precision-api`, `document-api` (note the pre-existing S3-mock `document-api` failures), `note`/`housingExport` paths
- the LOVAC import path (`scripts/import-lovac/housings/housing-command.ts`) — `find`/`stream` at scale.

## Tasks (phased — green checkpoint per phase)

1. [ ] **Baseline**: record green for `housingRepository.test.ts` + the API tests above.
2. [ ] **parseHousingRow** + a minimal `listQuery` (no includes, no filters): migrate `findOne` by id. Verify.
3. [ ] **include()** variants one at a time (owner+ban → campaigns → perimeters → precisions), each with its characterization test green.
4. [ ] **filterQuery** by family (subagent per family), each verified. This is the long pole.
5. [ ] **sort + paginate**, then `find`. Verify pagination + sort tests.
6. [ ] **count**. Verify.
7. [ ] **stream** (cursor). Verify the streaming/export path + LOVAC.
8. [ ] Full blast-radius run + `typecheck` + `lint`.
9. [ ] **Then** (follow-up PRs, now unblocked): `ownerRepository.find('housings')`/`findByHousing`, `housingOwnerRepository.findByOwner`.

## Definition of Done

- housing `find`/`findOne`/`stream`/`count` on Kysely; all housing filters/includes/sort/pagination behaviour-preserved; characterization + API tests green (except pre-existing S3-mock `document-api`).
- `parseHousingApi`/`parseHousingRecordApi` and the Knex export surface kept for seeds/LOVAC/still-Knex consumers.
- typecheck + lint clean. After this lands, owner/housingOwner reads are unblocked; remaining Knex readers shrink to draft/sender (the `joinDocumentWithCreator` port) before the final Knex removal.

## Risks / notes

- **Best-covered big file (~89%)** → strong net, but 31 call sites → verify broadly, not just the repo test.
- Streaming/cursor is the least-tested path — exercise the export + LOVAC flows explicitly.
- Keep every raw JSON aggregate snake_case (rely on `maintainNestedObjectKeys: true`); do NOT switch to `jsonObjectFrom` (camelCase) without also changing the parsers.
- The `filterQuery` raw SQL is where behaviour drift is most likely — pin each family with a characterization assertion before refactoring.
