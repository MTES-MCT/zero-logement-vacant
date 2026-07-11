# Knex → Kysely Migration — Big Picture & Status

> One-page map of the server's Knex→Kysely migration: what it is, why it's structured the way it is, what's shipped, and what's left. Diagrams render on GitHub, Notion and VS Code.
>
> **Status:** entire **write path** migrated; **group / campaign / housing** reads migrated; **owner / housingOwner.findByOwner / draft / sender** reads + final Knex removal remain.

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
  D["Remaining reads<br/>owner · housingOwner · draft/sender"]:::todo
  E["Step final<br/>drop Knex"]:::todo
  A --> B --> C --> D --> E

  classDef done fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef todo fill:#ffe0b2,stroke:#e65100,color:#000
```

| Phase | Scope | Status |
|---|---|---|
| **Step 1 — Bridge** | Dual-engine `startTransaction`, DATE parsing, camelCase plugin, Phase-2 characterization tests | ✅ Done (#1787) |
| **Write path** | All repository writes → Kysely, migrated as FK-coupled clusters | ✅ Done (6 PRs) |
| **Reads (done)** | group, campaign, housing (the big one) + note/document/housingDocument | ✅ Done (5 PRs) |
| **Reads (left)** | owner, `housingOwner.findByOwner`, draft, sender | ⬜ Remaining |
| **Step final** | Delete the Knex transaction store + `knex` dep; collapse `startTransaction` to Kysely-only | ⬜ Remaining |

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
  m --> hr["#1910 housing reads"]:::done

  classDef base fill:#d1c4e9,stroke:#4527a0,color:#000
  classDef done fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef plan fill:#fff9c4,stroke:#f9a825,color:#000
```

**Merge order:** `#1787` → the six write PRs (any order) → each stacked reads PR after its write PR. The two PLAN PRs (#1902, #1906) are docs and can merge anytime.

---

## 6. Per-repository status

| Repository | Writes | Reads | Where |
|---|---|---|---|
| signupLink / resetLink / precision | ✅ | ✅ | #1787 |
| **note** | ✅ | ✅ | #1897 |
| **document** | ✅ | ✅ | #1898 |
| **housingDocument** | ✅ | ✅ | #1899 |
| **group** | ✅ #1900 | ✅ #1904 | — |
| **campaign / draft / sender / campaignDraft / campaignHousing** | ✅ #1901 | campaign ✅ #1905 · **draft/sender ⬜** | — |
| **housing** | ✅ #1903 | ✅ #1910 | the big one |
| **owner** | ✅ #1903 | ⬜ (find/get/findOne/count/stream, FTS, housings-include) | unblocked by #1910 |
| **housingOwner** | ✅ #1903 | ⬜ `findByOwner` | unblocked by #1910 |
| **eventRepository** | ✅ per-cluster event methods | n/a | linchpin, migrated piecemeal with clusters |

---

## 7. Notable engineering findings (baked into the PRs)

- **FK-visibility limit of the bridge** → clusters, not repos. (§3)
- **Nested-JSON CamelCase bug** — Kysely's `CamelCasePlugin` recursively camelCased keys *inside* `to_json(...)` / `json_build_object(...)`, so the snake_case DBO parsers (`fromUserDBO`, `fromDocumentDBO`) silently returned `undefined` for every multi-word field. Fixed with `maintainNestedObjectKeys: true`. It was a **latent production bug** in the already-shipped note/document/housingDocument creator reads — their looser tests only asserted `id`/`email` (camel-invariant), so it slipped through; the strict housing/group read tests caught it.
- **DATE columns** return `YYYY-MM-DD` strings (pg type parser) to avoid the CET off-by-one; `date`-typed columns (`owners_housing.start_date`) are passed through as-is.
- **Streaming** (`housing.stream`) uses Kysely's cursor stream, wired via `pg-cursor`.
- Every PR **keeps the full Knex export surface** (table accessors, `*DBO` types, `format*`/`parse*`) so seeds, the LOVAC import, the test factory, and still-Knex readers keep working.

---

## 8. What's left (the final stretch)

```mermaid
flowchart LR
  hr["#1910 housing reads ✅<br/>(the enabler)"]:::done --> owner["owner reads +<br/>parseHousingRecordRow"]:::todo
  hr --> ho["housingOwner.findByOwner"]:::todo
  ds["draft / sender reads<br/>(joinDocumentWithCreator → Kysely)"]:::todo
  owner --> final
  ho --> final
  ds --> final
  final["Step final:<br/>drop Knex + collapse the bridge"]:::todo

  classDef done fill:#c8e6c9,stroke:#2e7d32,color:#000
  classDef todo fill:#ffe0b2,stroke:#e65100,color:#000
```

1. **owner / housingOwner reads** — need a camelCase `parseHousingRecordRow` + the housings-include reproduced (patterns proven in #1910).
2. **draft / sender reads** — port the Knex `joinDocumentWithCreator` to a Kysely correlated JSON (same shape as the housing includes).
3. **Step final** — delete the Knex transaction store + `knex` dependency; reduce `startTransaction` to a Kysely-only implementation.

Detailed, executable plans for the largest remaining pieces: [`plans/2026-07-10-kysely-housing-reads.md`](./superpowers/plans/2026-07-10-kysely-housing-reads.md) (mostly consumed by #1910) and [`plans/2026-07-10-kysely-housing-owner-mega-cluster.md`](./superpowers/plans/2026-07-10-kysely-housing-owner-mega-cluster.md).
