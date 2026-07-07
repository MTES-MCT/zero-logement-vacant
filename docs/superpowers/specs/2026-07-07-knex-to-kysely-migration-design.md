# Knex → Kysely Migration — Design

**Date:** 2026-07-07
**Branch:** `feat/kysely-setup`
**Status:** Approved design, ready for implementation planning

## Problem

The server is mid-migration from Knex to Kysely. Infra is in place (`kysely.ts`,
generated `db.d.ts`, `kysely-transaction.ts`, DATE-parser fix, camelCase plugin)
and three leaf repositories are migrated (`signupLink`, `resetLink`, `precision`).
We need a strategy to finish the migration **safely** and **in small, reviewable
steps**.

### The governing constraint

A database transaction is bound to a **single connection**. Knex and Kysely each
own a separate `pg.Pool`, so a single logical transaction **cannot span both
engines** — it is all-Knex or all-Kysely. There is no clean way to enlist a
Kysely query into a Knex transaction's connection.

### The live bug this creates

`precisionController.updatePrecisionsByHousing` (server/src/controllers/precisionController.ts:136)
runs inside a Knex `startTransaction`:

```ts
await startTransaction(async () => {              // opens a KNEX trx (Knex ALS)
  await Promise.all([
    precisionRepository.link(housing, precisions),           // Kysely repo
    eventRepository.insertManyPrecisionHousingEvents(events) // Knex repo
  ]);
});
```

`eventRepository` (Knex) joins the Knex transaction. `precisionRepository.link`
calls `withinKyselyTransaction`, reads the **Kysely** ALS — which is empty —
and opens its **own independent Kysely transaction on a different connection**.
The two commit independently: if the event insert rolls back, the precision link
may already have committed. **Atomicity is broken today.** `housingController`
also links precisions inside a Knex transaction and has the same latent split.

### The key reframe

The safe unit of migration is **not a repository — it is a transaction cluster**:
the set of repositories that must commit atomically together inside one
`startTransaction` block. Danger is proportional to **split clusters**, not to how
much has been migrated.

Following the "commit together" graph, the core write cluster is a single
connected component of ~15 repositories, with `eventRepository` as the linchpin
(it participates in every mutation's transaction) and `housing` as connective
tissue. There is no clean sub-cluster to carve off. Therefore incremental,
repo-by-repo migration is only safe with a **transaction bridge** that keeps mixed
clusters atomic during the transition.

## Coverage baseline (measured 2026-07-07)

Branch coverage from the repository test suite alone (368/369 passing; controller
API tests add more on top, so these are a conservative floor):

| Repo | Branch % | Note |
|---|---|---|
| `ownerRepository` | 56% (44% stmt) | worst soft spot — 703 LOC, 9 raw SQL |
| `eventRepository` | 60% | linchpin, under-covered |
| `housingOwnerRepository` | 53% | harden |
| `housingDocumentRepository` | 53% | harden |
| `documentRepository` | 63% | harden |
| `campaignHousingRepository` | 67% | borderline |
| `campaignRepository` | 76% | adequate |
| `groupRepository` | 75% | adequate |
| `draftRepository` | 84% | adequate |
| `housingRepository` | 89% | **best-covered big file — migrate-ready** |

The file most feared for its size (`housingRepository`, 1521 LOC, 45 raw-SQL
spots) is already the best-guarded. The real risk sits in the mid-tier core repos,
led by `ownerRepository` and `eventRepository`.

## Goal

Fully replace Knex with Kysely. Coexistence is a standing hazard (every split
cluster is a latent atomicity bug), so "keep both indefinitely" is not an
acceptable resting state. Reach the end state through **tests-first, then
incremental per-repo migration**, with a **review checkpoint after every step**.

## Invariants (must hold at every merged state)

1. **No split cluster without the bridge.** Once the bridge exists, any mixed
   Knex/Kysely cluster is acceptable because both engines commit together.
2. **Disjoint-table rule.** A single logical operation must not write the **same
   rows** through both engines (two connections → self-deadlock risk). Keep each
   operation's Knex-side and Kysely-side writes on different tables. Holds for
   precision (`housing_precisions` vs `events`).
3. **Characterization tests stay green.** Phase-2 tests pin down current Knex
   behavior; no migration PR may change them to pass.

## Plan

### Step 1 — Transaction bridge (foundation; fixes the live bug)

Make the single `startTransaction` open both engines' transactions, seed both
`AsyncLocalStorage` stores, and commit/roll back together:

```
startTransaction(cb):
  knexTrx = await db.transaction()
  return kysely.transaction().execute(async (kyselyTrx) => {
    try {
      result = await knexStore.run({ knexTrx }, () =>
                 kyselyStore.run({ kyselyTrx }, cb))
      await knexTrx.commit()      // commit Knex first…
      return result               // …then Kysely commits as this callback resolves
    } catch (e) {
      await knexTrx.rollback()    // Kysely rolls back via the throw
      throw e
    }
  })
```

Repos are unchanged: Knex repos read the Knex store, Kysely repos read the Kysely
store — both now populated. Deliverable includes a regression test asserting that
mixed Knex+Kysely writes in one `startTransaction` roll back as a unit.

**Accepted residual risks (transition-only, removed in the final step):**
- *Commit window:* if Knex commit succeeds but Kysely commit then fails, state is
  inconsistent. Irreducible two-connection window; commit-time only.
- *Self-deadlock:* mitigated by the disjoint-table invariant.

**Stretch (not Step 1):** build Kysely over Knex's checked-out connection for true
single-transaction atomicity. Cleaner but couples to Knex internals; keep in
reserve.

### Phase 2 — Characterization tests (separate phase, one repo per PR)

Written against the **current Knex** code. Target ~85%+ branch. Order:

1. `eventRepository` (60%)
2. `ownerRepository` (56%)
3. `housingOwnerRepository` (53%)
4. `housingDocumentRepository` (53%)
5. `documentRepository` (63%)
6. `campaignHousingRepository` (67%)

`housing`, `draft`, `campaign`, `group` are already adequate — skip or light
top-up. Each PR is pure test additions: small, green, easy to review.

### Phase 3 — Incremental migration (separate phase, one repo per PR)

Each PR migrates one repository to Kysely, adjusts its controller's transaction
call as needed, and keeps the Phase-2 tests green — all behind the bridge, so
every intermediate state is atomic. Order: spokes → hubs → linchpin last.

```
note → document → housingDocument → housingOwner → owner
sender → campaignHousing → campaignDraft → draft → group → campaign
housing
event            (last — flips every cluster to pure Kysely)
```

### Step final — Remove Knex

Once all core repos are Kysely: delete the Knex transaction store and the bridge's
Knex half, drop the `knex` dependency, and reduce `startTransaction` to a
Kysely-only implementation.

## Review gates

One checkpoint after every step: Step 1, each Phase-2 test PR, each Phase-3
migration PR, and the final removal. Small diffs, independently reviewable.

## Definition of done

- All repositories use Kysely; `knex` is removed from `server` dependencies.
- Single Kysely-only `startTransaction`; the dual-engine bridge is gone.
- Full server test suite green; branch coverage on former Knex core repos ≥ ~85%.
- No split clusters and no dual-engine writes remain (both moot once Knex is gone).
