# Knex → Kysely Migration — Big Picture & Status

> One-page map of the server's Knex→Kysely migration: what it is, why it's structured the way it is, what's shipped, and what's left. Diagrams render on GitHub, Notion and VS Code.
>
> **Status:** entire **write path** and **all core-repository reads** migrated. Only **Step final** (collapse the dual-engine bridge) remains — and it's gated on merging the PR stack. Full removal of the `knex` dependency is out of scope (seeds, LOVAC import, migrations and test factories keep Knex).

---

## 1. The goal in one sentence

Replace **Knex** with **[Kysely](https://kysely.dev/)** (typed SQL) across the server, **without changing behaviour**, in **small independently-reviewable PRs**, each kept green by the existing characterization tests.

---

## 2. Progress at a glance

```mermaid
flowchart LR
  A["Step 1<br/>Bridge + Phase-2 tests<br/>#1787"]:::done
  B["Write path<br/>6 clusters"]:::done
  C["Reads<br/>group · campaign · housing"]:::done
  D["Reads (part 2)<br/>owner · housingOwner · draft/sender"]:::done
  E["Step final<br/>collapse the bridge<br/>(gated on merge)"]:::todo
  A --> B --> C --> D --> E

  classDef done fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef todo fill:#ffe0b2,stroke:#e65100,color:#000
```

| Phase | Scope | Status |
|---|---|---|
| **Step 1 — Bridge** | Dual-engine `startTransaction`, DATE parsing, camelCase plugin, Phase-2 characterization tests | ✅ Done (#1787) |
| **Write path** | All repository writes → Kysely, migrated as FK-coupled clusters | ✅ Done (6 PRs) |
| **Reads (part 1)** | group, campaign, housing (the big one) + note/document/housingDocument | ✅ Done (5 PRs) |
| **Reads (part 2)** | owner (#1912), `housingOwner.findByOwner` (#1913), draft + sender (#1914) | ✅ Done (3 PRs) |
| **Step final** | Collapse `startTransaction` to Kysely-only (drop the Knex transaction store). *Not* full `knex` removal — seeds/LOVAC/migrations/factories keep it. | ⬜ Gated on merging the stack |

---

## 3. The one idea that shapes everything: the dual-engine bridge

Knex and Kysely each own a **separate connection pool**. A single DB transaction lives on **one connection**, so it can't span both engines. The **bridge** makes one `startTransaction` open a Knex transaction *and* a Kysely transaction and commit them **together**.

```mermaid
flowchart TB
  subgraph tx["one startTransaction()"]
    direction LR
    K["Knex txn<br/>connection A"]:::knex
    Y["Kysely txn<br/>connection B"]:::kysely
  end
  K --- ok["commit / rollback together<br/>ATOMIC ✅"]:::ok
  Y --- ok
  K --- no["neither sees the other's<br/>UNCOMMITTED rows ❌"]:::no
  Y --- no

  classDef knex fill:#ffe0b2,stroke:#e65100,color:#000
  classDef kysely fill:#bbdefb,stroke:#1565c0,color:#000
  classDef ok fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef no fill:#ffcdd2,stroke:#c62828,color:#000
```

**The catch we discovered the hard way:** the bridge gives atomic commit but **NOT cross-engine visibility**. If a repo's Kysely write references a row a **Knex sibling inserts in the same transaction**, you get a live foreign-key violation — not just the documented commit-window risk.

```mermaid
sequenceDiagram
  autonumber
  participant K as Knex connection
  participant P as Kysely connection
  Note over K,P: inside ONE startTransaction
  K->>K: INSERT campaigns  (uncommitted)
  P->>P: INSERT campaigns_housing  (FK → campaigns)
  Note over P: Kysely can't see the uncommitted campaign
  P-->>P: 💥 campaigns_housing_campaign_id_foreign violation
```

**Consequence:** you can migrate a repo **independently** only when its FK targets are already committed before the transaction (true for the "leaf" repos). Otherwise the FK-coupled set must migrate **together**. This is why the work is organised as *clusters*, not one-repo-at-a-time. (Captured as a durable project note so it isn't rediscovered.)

---

## 4. Transaction clusters — what had to move together

A cluster = the repos whose writes must commit atomically **and** reference each other's rows inside one `startTransaction`. Leaves migrate alone; clusters migrate as a unit (repo writes **+** their event-table method).

```mermaid
flowchart TB
  subgraph leaves["LEAVES — FK targets pre-committed → migrate alone"]
    note["note"]:::done
    doc["document"]:::done
    hdoc["housingDocument"]:::done
  end
  subgraph groupC["GROUP cluster"]
    grp["group writes"]:::done
    gev["insertManyGroupHousingEvents"]:::done
  end
  subgraph campC["CAMPAIGN cluster"]
    camp["campaign · draft · sender · campaignDraft · campaignHousing"]:::done
    cev["campaign(-housing) event methods"]:::done
  end
  subgraph megaC["HOUSING + OWNER mega-cluster"]
    mega["housing · owner · housingOwner writes"]:::done
    mev["housing / owner / housingOwner event methods + refreshMultiOwnerFlags"]:::done
  end
  ev(["eventRepository — the linchpin<br/>event join-tables FK the entities;<br/>each cluster migrates its own event method"]):::infra

  leaves -.-> ev
  groupC -.-> ev
  campC -.-> ev
  megaC -.-> ev

  classDef done fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef infra fill:#e1bee7,stroke:#6a1b9a,color:#000
```

Why `campaignHousing` couldn't be a leaf, but `note` could: `campaigns_housing → campaigns` is written in the same transaction as the (then-Knex) `campaigns` insert; `note`'s FK targets (`users`, `housing`) were already committed.

---

## 5. PR map & merge order

Every PR targets the integration branch `feat/kysely-setup` (#1787). **Reads stack on their write branch** (they touch the same repo file), so they can't be independent.

```mermaid
flowchart TD
  main[["main"]]
  base["#1787 · setup + bridge + Phase-2 tests<br/>(integration branch)"]:::base
  main --> base

  base --> n["#1897 note"]:::done
  base --> d["#1898 document"]:::done
  base --> hd["#1899 housingDocument"]:::done
  base --> g["#1900 group cluster"]:::done
  base --> c["#1901 campaign cluster"]:::done
  base --> m["#1903 housing+owner mega-cluster"]:::done
  base --> plan1["#1902 mega-cluster PLAN"]:::plan
  base --> plan2["#1906 housing-reads PLAN"]:::plan

  g --> gr["#1904 group reads"]:::done
  c --> cr["#1905 campaign reads"]:::done
  c --> dsr["#1914 draft/sender reads"]:::done
  m --> hr["#1910 housing reads"]:::done
  hr --> orr["#1912 owner reads"]:::done
  hr --> hor["#1913 housingOwner.findByOwner"]:::done

  classDef base fill:#d1c4e9,stroke:#4527a0,color:#000
  classDef done fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef plan fill:#fff9c4,stroke:#f9a825,color:#000
```

**Merge order:** `#1787` → the six write PRs (any order) → each stacked reads PR after its write PR. Specifically: `#1910` before `#1912`/`#1913` (they add `parseHousingRecordRow` on top of it), and `#1901` before `#1914`. The two PLAN PRs (#1902, #1906) are docs and can merge anytime.

---

## 6. Per-repository status

| Repository | Writes | Reads | Where |
|---|---|---|---|
| signupLink / resetLink / precision | ✅ | ✅ | #1787 |
| **note** | ✅ | ✅ | #1897 |
| **document** | ✅ | ✅ | #1898 |
| **housingDocument** | ✅ | ✅ | #1899 |
| **group** | ✅ #1900 | ✅ #1904 | — |
| **campaign / draft / sender / campaignDraft / campaignHousing** | ✅ #1901 | campaign ✅ #1905 · draft/sender ✅ #1914 | — |
| **housing** | ✅ #1903 | ✅ #1910 | the big one |
| **owner** | ✅ #1903 | ✅ #1912 (find/get/findOne/count/stream, FTS, housings-include) | stacked on #1910 |
| **housingOwner** | ✅ #1903 | ✅ #1913 `findByOwner` | stacked on #1910 |
| **eventRepository** | ✅ per-cluster event methods | n/a | linchpin, migrated piecemeal with clusters |

---

## 7. Notable engineering findings (baked into the PRs)

- **FK-visibility limit of the bridge** → clusters, not repos. (§3)
- **Nested-JSON CamelCase bug** — Kysely's `CamelCasePlugin` recursively camelCased keys *inside* `to_json(...)` / `json_build_object(...)`, so the snake_case DBO parsers (`fromUserDBO`, `fromDocumentDBO`) silently returned `undefined` for every multi-word field. Fixed with `maintainNestedObjectKeys: true`. It was a **latent production bug** in the already-shipped note/document/housingDocument creator reads — their looser tests only asserted `id`/`email` (camel-invariant), so it slipped through; the strict housing/group read tests caught it.
- **DATE columns** return `YYYY-MM-DD` strings (pg type parser) to avoid the CET off-by-one; `date`-typed columns (`owners_housing.start_date`) are passed through as-is.
- **Streaming** (`housing.stream`) uses Kysely's cursor stream, wired via `pg-cursor`.
- **`text[]` equality filters** (e.g. `ownerRepository.findOne` on `address_dgfip`) must bind the array via a `sql\`col = ${arr}\`` fragment — a plain `.where(col, '=', array)` makes Kysely emit `text[] = record` and blows up at runtime.
- **camelCase read rows vs snake writes.** Reads add a camelCase `parseXRow` reading `Selectable<DB['table']>` (Kysely returns camelCase columns) beside the kept snake `parseXApi`; the two are not interchangeable. The classic trap: `parseHousingOwnerRow` reading `row.housing_geo_code` returns `undefined`, which then surfaced as a null-constraint violation when writing housing-owner events.
- **`joinDocumentWithCreator` → correlated subquery.** Draft/sender reads reproduce the Knex document+creator leftJoin as a Kysely correlated scalar subquery (`selectDocumentWithCreator`) that emits the same `jsonb_build_object(... 'creator', json_build_object(...))` blob and resolves to `NULL` when the FK is unset. The non-null branch (a real document with its nested creator) had **zero read-path coverage** before — the alias keys and nested-JSON handling had only ever been exercised with null documents, the exact blind spot behind the CamelCase bug above — so #1914 adds a `findOne` test that asserts the hydrated document + creator.
- **`paginate()` default.** `ownerRepository.find` relied on `paginate()` defaulting to `{ page: 1, perPage: 50 }`; the Kysely rewrite must reproduce that default so unpaginated calls stay capped at 50 rows.
- Every PR **keeps the full Knex export surface** (table accessors, `*DBO` types, `format*`/`parse*`) so seeds, the LOVAC import, the test factory, and still-Knex readers keep working.

---

## 8. What's left (the final stretch)

All repository writes **and** reads are migrated. The only remaining work is **Step final**, and it is **gated on the PR stack merging** — no single branch holds every migration, so the bridge can only be collapsed once they're all on the integration branch.

```mermaid
flowchart LR
  reads["all reads ✅<br/>#1904 · #1905 · #1910 · #1912 · #1913 · #1914"]:::done --> merge["merge the stack<br/>onto #1787"]:::todo
  merge --> final["Step final:<br/>collapse startTransaction to<br/>Kysely-only, drop the Knex txn store"]:::todo

  classDef done fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef todo fill:#ffe0b2,stroke:#e65100,color:#000
```

**Step final — scope and non-scope:**

- **In scope:** once every transactional write is Kysely, simplify `server/src/infra/database/transaction.ts` — `startTransaction` drops its Knex side (`db.transaction`, the `AsyncLocalStorage` Knex store, `withinTransaction`) and becomes a plain `kysely.transaction().execute(...)`. This is a mechanical simplification, verifiable by the existing characterization tests.
- **Out of scope:** removing the `knex` dependency itself. Seeds (demo/dev/prod), the LOVAC import scripts, the Knex migration files, and the test factories all still use raw Knex and the intentionally-kept repository accessors. Dropping `knex` would mean rewriting all of those — a separate, much larger effort with no behaviour benefit.
- **Prerequisite:** it can't start until #1897–#1914 are merged onto #1787, because the FK-visibility constraint (§3) means a half-migrated tree still needs the Knex transaction side alive.

Detailed, executable plans for the largest pieces already shipped: [`plans/2026-07-10-kysely-housing-reads.md`](./superpowers/plans/2026-07-10-kysely-housing-reads.md) (consumed by #1910) and [`plans/2026-07-10-kysely-housing-owner-mega-cluster.md`](./superpowers/plans/2026-07-10-kysely-housing-owner-mega-cluster.md).
