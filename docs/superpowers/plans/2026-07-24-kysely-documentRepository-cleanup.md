# Kysely Migration — documentRepository Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove `joinDocumentWithCreator`, the last live Knex query call anywhere in `server/src/repositories/`, found in a final exhaustive sweep after `eventRepository`'s migration.

**Architecture:** `joinDocumentWithCreator` mutates a `Knex.QueryBuilder` parameter passed in by a caller — its entire purpose was letting other, still-Knex repositories compose a document+creator JSON join onto their own query. Its own doc comment already called `selectDocumentWithCreator` (Kysely, added earlier in this migration effort) its "mirror," and `selectDocumentWithCreator` is confirmed actively used by `senderRepository.ts` and `draftRepository.ts`. Now that `establishmentRepository` (its last remaining Knex-side caller) is migrated, `joinDocumentWithCreator` has zero callers anywhere — structurally obsolete, not just currently-unused, since there are no more Knex query builders left in the repository layer to bridge into.

**Kept:** `Documents()`/`Knex`/`db` imports in `documentRepository.ts` — still needed for the `Documents()` test/seed accessor.

## Global Constraints

- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings; (3) `documentRepository.test.ts`, `document-api.test.ts`, `draftRepository.test.ts`, `draft-api.test.ts` green.
- **Commit messages:** English; scope `feat(server)`.

---

### Task 1: Remove joinDocumentWithCreator

**Files:**

- Modify: `server/src/repositories/documentRepository.ts`
- Modify: `server/src/repositories/test/documentRepository.test.ts`

- [x] **Step 1: Remove `joinDocumentWithCreator`** and update `selectDocumentWithCreator`'s doc comment (it's no longer a "mirror" of anything).
- [x] **Step 2: Remove its test** and the now-unused `HousingDocuments`/`HOUSING_DOCUMENT_TABLE`/`Housing`/`formatHousingRecordApi`/`genHousingApi` test imports.
- [x] **Step 3: Mandatory gates**

Run: `yarn nx typecheck server` — 0 errors.
Run: `yarn lint` — 0 warnings.
Run: `yarn nx test server -- run src/repositories/test/documentRepository.test.ts src/controllers/test/document-api.test.ts` — 2 files, 52/52 pass.
Run: `yarn nx test server -- run src/repositories/test/draftRepository.test.ts src/controllers/test/draft-api.test.ts` — 2 files, 15/15 pass (covers `selectDocumentWithCreator`'s other consumer).

- [ ] **Step 4: Commit**

```bash
git add server/src/repositories/documentRepository.ts server/src/repositories/test/documentRepository.test.ts
git commit -m "feat(server): remove dead joinDocumentWithCreator from documentRepository"
```

## Outcome

This was the actual last live Knex query call in `server/src/repositories/`. A repo-wide `grep` confirms zero remaining `db(...)`/`db.raw(...)`/`.whereRaw(...)`/`.joinRaw(...)`/`.batchInsert(...)`/`db.transaction(...)` calls in any repository or service file. Knex now remains only for: migrations/seeds (`server/src/infra/database/migrations/`, `server/src/infra/database/seeds/`), primitive test/seed table accessors (`Users()`, `Owners()`, etc. — deliberately out of scope per `backend-conventions.md`), and the import-lovac ETL scripts (explicitly excluded from this whole effort's scope).
