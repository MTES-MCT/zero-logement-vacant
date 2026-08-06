---
name: mise-en-production
description: >
  ZLV production deploy summary workflow.
  Use when preparing a production release (mise en production):
  writing the GitHub deploy PR summary, finding Notion tickets,
  creating the corresponding Notion release note page, and linking
  the shipped tickets to it via the "Tâches concernées" relation.
---

# Mise en Production — ZLV Workflow

## Inputs
- **Deploy PR number** — the GitHub PR that merges `main` into `prod`
- **Excluded commits** — any commits pushed directly to `main` (not via PR)

---

## Steps

### 1 — Find all merged PRs

```bash
git log --oneline --merges origin/prod..HEAD
```

Each line is a merge commit. Extract the PR number from the message (e.g. `Merge pull request #1762`).

> **Do not rely on the deploy PR's existing description.** Enumerate via git log; then fetch each PR individually to get its title, branch, and description.

### 2 — Fetch PR details + Notion links

For each PR number `N`:

```bash
# PR metadata
gh pr view N --json number,title,body,headRefName,url

# PR review comments (inline)
gh api repos/MTES-MCT/zero-logement-vacant/pulls/N/comments --jq '.[].body'

# PR issue comments (timeline)
gh api repos/MTES-MCT/zero-logement-vacant/issues/N/comments --jq '.[].body'
```

Extract any Notion URL found in body or comments. Notion URLs match `https://www.notion.so/...`, `https://notion.so/...`, or `https://app.notion.com/...` (the `github_linkback` comments ZLV's GitHub↔Notion integration posts use this last form — it's the common case in practice).

Keep a running list of `(PR number, Notion URL)` pairs — one PR can carry more than one Notion link (e.g. a single fix closing two reported tickets). This list is reused in step 6b to link tickets to the release page.

### 3 — Categorize PRs

Use the branch name prefix as the primary signal:

| Prefix | Section |
|--------|---------|
| `feat/` | Fonctionnalités |
| `fix/` | Corrections de bugs |
| `perf/` | Performance |
| `refactor/` | Refactoring technique |
| `deps/`, `chore/` | Sécurité / Maintenance |

When the prefix is ambiguous, use the PR title and description to decide. Add new sections if needed (e.g. **Documentation**, **Infrastructure**).

### 4 — Write the GitHub summary

One `###` entry per PR. Format:

```markdown
### <PR title (translated to French if needed)>

<One-sentence description of what changed and why, in French.>

**Notion :** [<page title>](<notion url>)   ← omit line if no Notion link
**GitHub :** [<PR title>](<PR url>)
```

Full structure:

```markdown
## Fonctionnalités

### ...

## Corrections de bugs

### ...

## Performance

### ...

## Refactoring technique

### ...

## Sécurité

### ...
```

Omit any section that has no entries.

### 4b — Write the Notion summary

A compact, non-technical version of the same content. Produce this **after** the GitHub summary.

**Opening line:** one sentence counting the entries per section, e.g.:
> *Cette mise en production apporte 3 nouvelles fonctionnalités, 1 refactoring technique et 2 corrections.*

**Per section:** a flat bullet list — no `###` headings per item. Each bullet:
- If a Notion link exists: `- [<French title>](<notion url>) : <one-sentence description in plain French.>`
- If no Notion link: `- **<French title>** : <one-sentence description in plain French.>`

Sections and their Notion-friendly labels:

| GitHub section | Notion label |
|---|---|
| Fonctionnalités | Fonctionnalités |
| Corrections de bugs | Corrections |
| Performance | Améliorations |
| Refactoring technique | Refactoring technique |
| Sécurité / Maintenance | Maintenance |
| Tests | Tests |

Keep all sections that have entries. Omit GitHub links entirely. Descriptions must be readable by a non-technical audience (no code references, no PR numbers, no branch names).

Example:

```markdown
Cette mise en production apporte 3 nouvelles fonctionnalités, 1 refactoring technique et 2 corrections de tests.

## Fonctionnalités

- [Navigation vers les logements depuis une campagne](https://notion.so/...) : Nouveau bouton « Voir les logements » sur la page de détail d'une campagne.
- [Export groupe différencié de l'export campagne](https://notion.so/...) : Colonnes réorganisées et renommées ; fiabilité d'adresse affichée en pourcentage.
- **Réorganisation du tableau des destinataires** : Colonnes réordonnées, tri automatique par destinataire principal.

## Refactoring technique

- [Synchronisation BAN unifiée](https://notion.so/...) : Remplace 4 processus redondants par un job quotidien idempotent ; corrige un bug de boucle.

## Tests

- **Fixtures cohérentes** : Sous-statuts désormais cohérents avec le statut des logements.
- **Correction des tests E2E d'inscription.**
```

### 5 — Update the GitHub deploy PR

```bash
gh pr edit <deploy-pr-number> --body "$(cat <<'EOF'
<full summary markdown>
EOF
)"
```

Verify with `gh pr view <deploy-pr-number>`.

### 6 — Create the Notion release page (use the Notion summary from step 4b)

**Data source ID:** `ef70347c-cb99-4fad-8c14-0f6f002a901c`  
**Template page ID:** `12f9ec2a056c80bf84d6d8e6e7d5fded`

The date to use is **the actual day the deploy runs (today)**, not necessarily the date baked into the deploy PR's title — those can drift apart if the PR was opened one day and merged/deployed the next. If the two dates differ, ask the user which one to use before creating the page.

1. Create the page from the template:
```
mcp__notion__notion-create-pages
  parent: { type: "data_source_id", data_source_id: "ef70347c-cb99-4fad-8c14-0f6f002a901c" }
  pages: [{
    properties: { "Nom": "Mise en production - DD/MM/YYYY", "date:Date:start": "YYYY-MM-DD", "date:Date:is_datetime": 0 },
    template_id: "12f9ec2a056c80bf84d6d8e6e7d5fded"
  }]
```

2. Append the Notion summary (step 4b) to the page body with `mcp__notion__notion-update-page` (`insert_content`, `position: {type: "end"}`) — the template only provides a filter-date reminder and an inline database, no content placeholder.

### 6b — Link the shipped tickets ("Tâches concernées")

The release page has a relation property **`Tâches concernées`**, targeting the **"To do - DEV"** data source (`collection://88f9fbab-8dee-4172-9dc4-e5691ba618b7`). Populate it from the `(PR number, Notion URL)` pairs collected in step 2:

1. For each distinct Notion URL from step 2, confirm it's actually a page in that data source (query it, or just try the update — a URL from a different database won't resolve as a valid relation target). Drop/flag any that don't belong there.
2. **Fetch the release page first** and read its current `Tâches concernées` value — `update_properties` **replaces** the whole array, it does not append. Union the existing URLs with the new ones before writing back, so you never drop a ticket someone already linked manually.
3. Write the union with `mcp__notion__notion-update-page` (`update_properties`, property name `Tâches concernées`).

**Do not touch the tickets' own `Etat` (status) property or their board position.** Moving a card between columns is a manual step the team owns deliberately (see below) — this workflow only ever adds relation links, never mutates task state.

**Don't gate on the ticket's current `Etat`.** A ticket's board column can lag behind what's actually shipped (e.g. still shown `🎮 revue FONCT` when its PR has already merged and deployed) — link every ticket found via a merged PR's Notion backlink regardless of its current column. Conversely, a ticket sitting in `💚 OK pour MEP` with **no** merged PR referencing it in this batch is *not* part of this release — don't add it just because of its column.

Report both kinds of mismatch to the user as an FYI (worth a nudge to whoever owns the stale card), but don't block on it — linking is non-destructive, so proceed by default with everything found via PR backlinks.

> **Don't bother querying the "Pull Requests GitHub" Notion database directly** (the relation target behind the `Numéro de PR Github` rollup on tasks) — it returned 404 for this integration in practice. The Notion links extracted from PR bodies/comments in step 2 are the reliable path.

### 7 — Verify

- [ ] All merged PRs appear in the summary (cross-check count with `git log --merges` output)
- [ ] Every PR with a Notion link has it displayed
- [ ] GitHub deploy PR body updated correctly (`gh pr view`)
- [ ] Notion page created with correct title and content
- [ ] `Tâches concernées` contains every ticket linked from a merged PR, plus whatever was already there before this run (nothing dropped)

---

## Constants (ZLV-specific)

| Item | Value |
|------|-------|
| Repo slug | `MTES-MCT/zero-logement-vacant` |
| Notion "Notes de version (MEP)" data source | `ef70347c-cb99-4fad-8c14-0f6f002a901c` |
| Notion release-note template page | `12f9ec2a056c80bf84d6d8e6e7d5fded` |
| Notion "To do - DEV" data source | `88f9fbab-8dee-4172-9dc4-e5691ba618b7` |
| Relation property (release → tasks) | `Tâches concernées` |
| Base branch for prod | `origin/prod` |
