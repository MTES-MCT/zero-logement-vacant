# Kysely Migration — Phase 2: banAddressesRepository Characterization Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Close the characterization gap for `banAddressesRepository`'s `getByRefId`/`remove` (untested; `save`/`saveMany` already had tests) before migrating all 4 functions to Kysely.

**Architecture:** Add tests to the existing `server/src/repositories/test/banAddressesRepository.test.ts`.

## Global Constraints

- **`parseAddressApi` is reused externally** by `ownerRepository.ts` to parse the `to_json(ban.*)` blob it joins in — that blob stays snake_case regardless of engine (`CamelCasePlugin`'s `maintainNestedObjectKeys: true` leaves raw-SQL JSON aggregates untouched). `parseAddressApi` must stay unchanged; the Kysely migration needs a separate camelCase-native row parser for `getByRefId`'s direct column select.
- **Characterization discipline:** tests document CURRENT behavior and MUST pass against current code. Do NOT modify `banAddressesRepository.ts` in this phase.
- **MANDATORY gates before commit:** (1) `yarn nx typecheck server` → 0 errors; (2) `yarn lint` → 0 warnings.
- **Commit messages:** English; scope `test(server)`.

---

### Task 1: Characterize getByRefId/remove

- [x] **Step 1: `getByRefId`** — found, not-found, and addressKind-mismatch (same refId, different kind → not found).
- [x] **Step 2: `remove`** — removes the matching (refId, addressKind) row; does not remove a different addressKind's row for the same refId.
- [x] **Step 3: Run and verify coverage**

Run: `yarn nx test server -- run src/repositories/test/banAddressesRepository.test.ts --coverage --coverage.include='src/repositories/banAddressesRepository.ts'`
Result: 100% statements/functions/lines, 68.42% branches (8 tests) — remaining gaps are pure-converter null-coalescing ternaries in `parseAddressApi`/`formatAddressApi`, not query logic.

- [x] **Step 4: Mandatory gates** — `yarn nx typecheck server` (0 errors), `yarn lint` (0 warnings).
- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/test/banAddressesRepository.test.ts
git commit -m "test(server): characterize banAddressesRepository getByRefId and remove"
```
