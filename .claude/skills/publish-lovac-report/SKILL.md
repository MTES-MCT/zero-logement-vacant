---
name: publish-lovac-report
description: Publish a French-language LOVAC import report to Notion after all subcommands and snapshots are complete. Reads snapshot-*-pre.json / snapshot-*-post.json and *.report.json files from the current directory.
invocation: /publish-lovac-report <year>
example: /publish-lovac-report lovac-2026
---

# Skill: publish-lovac-report

## Scope

**This skill does NOT run shell scripts or import commands.** It is a post-import reporting step only. All import subcommands and `stats/snapshot.sh` calls must have completed before invoking this skill.

**Language:** All Notion content is published **in French**.

## Prerequisites (verify before publishing)

- `NOTION_TOKEN` environment variable is set
- `NOTION_LOVAC_PARENT_PAGE_ID` environment variable is set
- The following files exist in the current directory for the given year:
  - `snapshot-owners-pre.json` and `snapshot-owners-post.json`
  - `snapshot-housings-pre.json` and `snapshot-housings-post.json`
  - `snapshot-housing-owners-pre.json` and `snapshot-housing-owners-post.json`
  - `import-lovac-<year>-owners.report.json` (or equivalent report files)

## Steps

### 1. Read all snapshot and report files

Read each file listed above. Compute deltas for each entity:
- `delta = post_value - pre_value`
- `pct = delta / pre_value * 100` (formatted as `+1.9 %`)

### 2. Authenticate with Notion MCP

Use the `mcp__claude_ai_Notion__authenticate` tool if not already authenticated.

### 3. Create a new Notion sub-page

Create a new page under `NOTION_LOVAC_PARENT_PAGE_ID` with title:
```
Import LOVAC <year> — <date in French, e.g. "14 avril 2026">
```

### 4. Publish the page content in French

Publish using native Notion blocks in this order:

#### Section 1 — Propriétaires

- **Heading 2:** `Propriétaires`
- **Callout block** (ℹ️ icon) for the key total:
  `"<post_total> propriétaires après import, <delta_str> (<pct>)"`
  Example: `"36 041 936 propriétaires après import, +684 137 (+1,9 %)"`
- **Table block** with columns `Métrique | Avant | Après | Δ` for:
  - Total
  - Avec `idpersonne` / Sans `idpersonne`
  - Avec adresse DGFIP / Sans adresse DGFIP
- **Table block** `Par type (kind_class)`: category → before/after/delta
- **Table block** `Par source de données (data_source)`: category → before/after/delta

#### Section 2 — Logements

- **Heading 2:** `Logements`
- **Callout block** (ℹ️ icon): `"<post_total> logements après import, <delta_str> (<pct>)"`
- **Table block** with columns `Métrique | Avant | Après | Δ` for:
  - Total
  - `rooms_count` nul / `living_area` nul
- **Table block** `Par occupation`: category → before/after/delta
- **Table block** `Par statut`: category → before/after/delta
- **Table block** `Par année de fichier (data_file_years)`: category → before/after/delta

#### Section 3 — Droits de propriété

- **Heading 2:** `Droits de propriété`
- **Callout block** (ℹ️ icon): `"<post_total> liens après import, <delta_str> (<pct>)"`
- **Table block** with columns `Métrique | Avant | Après | Δ` for:
  - Total
  - Avec / sans `idprocpte`
- **Table block** `Par rang (rank)`: category → before/after/delta

#### Section 4 — Événements créés

- **Heading 2:** `Événements créés`
- **Table block** with columns `Type | Nombre` listing event types and their counts from the post snapshot

#### Section 5 — Rapport d'import

- **Heading 2:** `Rapport d'import`
- For each `*.report.json` found in the current directory, add:
  - **Heading 3:** filename
  - **Table block** `Métrique | Valeur` with: créés, mis à jour, ignorés, en erreur, durée (ms)

### 5. Print the Notion page URL

After publishing, output the URL of the created Notion page.
