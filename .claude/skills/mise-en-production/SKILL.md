---
name: mise-en-production
description: >
  ZLV production deploy summary workflow.
  Use when preparing a production release (mise en production):
  writing the GitHub deploy PR summary, finding Notion tickets,
  and creating the corresponding Notion release note page.
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

Extract any Notion URL found in body or comments. Notion URLs match `https://www.notion.so/...` or `https://notion.so/...`.

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

### 4 — Write the summary

Format per entry (inside its section):

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

### 5 — Update the GitHub deploy PR

```bash
gh pr edit <deploy-pr-number> --body "$(cat <<'EOF'
<full summary markdown>
EOF
)"
```

Verify with `gh pr view <deploy-pr-number>`.

### 6 — Create the Notion release page

**Database ID:** `ef70347c-cb99-4fad-8c14-0f6f002a901c`  
**Template page ID:** `12f9ec2a056c80bf84d6d8e6e7d5fded`

Use the Notion MCP tools (available after `/mcp` auth):

1. Create the page from the template:
```
mcp__notion__notion-create-pages
  parent: { database_id: "ef70347c-cb99-4fad-8c14-0f6f002a901c" }
  properties: { title: [{ text: { content: "Mise en production - DD/MM/YYYY" } }] }
  template_id (if supported) OR duplicate template page first
```

2. Append the summary content to the page body using `mcp__notion__notion-update-page` or `mcp__notion__notion-update-data-source`.

> **Note:** The Notion MCP server may not support template cloning directly. If so, use `mcp__notion__notion-duplicate-page` on the template page ID, then move it into the database and rename it.

### 7 — Verify

- [ ] All merged PRs appear in the summary (cross-check count with `git log --merges` output)
- [ ] Every PR with a Notion link has it displayed
- [ ] GitHub deploy PR body updated correctly (`gh pr view`)
- [ ] Notion page created with correct title and content

---

## Constants (ZLV-specific)

| Item | Value |
|------|-------|
| Repo slug | `MTES-MCT/zero-logement-vacant` |
| Notion DB | `ef70347c-cb99-4fad-8c14-0f6f002a901c` |
| Notion template | `12f9ec2a056c80bf84d6d8e6e7d5fded` |
| Base branch for prod | `origin/prod` |
