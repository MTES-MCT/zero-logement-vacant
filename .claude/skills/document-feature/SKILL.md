---
name: document-feature
description: >
  ZLV feature-documentation workflow. Use when asked to document a feature or
  workflow for Notion (e.g. "documente cette feature dans Notion", "écris la
  doc fonctionnelle de X") — produces a French-language page under
  "Documentation fonctionnelle et technique" readable by both product/support
  and developers from a single artifact.
---

# Skill: document-feature

## Scope

Produces one Notion page per feature/workflow, in French, following the house
style of the existing pages under "⛑️ Documentation fonctionnelle et
technique." Every invocation is explicit and conversational — this skill does
not run automatically (no hook on merge/deploy), and it does not author new
tests to close coverage gaps it notices, only flags them.

Design rationale: [2026-08-06-document-feature-skill-design.md](../../../docs/superpowers/specs/2026-08-06-document-feature-skill-design.md).

## Inputs

- **The feature/workflow to document** — a name or short description.
- **Design spec path(s)**, if any exist under `docs/superpowers/specs/`. Not required — many workflows have none.
- **Target Notion section**, if known. Otherwise inferred from the existing tree under "Documentation fonctionnelle et technique" and confirmed with the user before publishing.

## Steps

### 1 — Establish current behavior from source (always)

Read the actual implementation: controllers, services, migrations, cron
config, repair/backfill scripts relevant to the feature. This is ground
truth for what happens *now* and is never skipped, spec or no spec.

### 2 — Cross-check against a design spec, if one exists

If `docs/superpowers/specs/*.md` covers this feature, mine it for *why*
(rationale, rejected alternatives, edge cases already thought through) —
**treat it as presumptively stale by default**, even if it may still be
accurate. A spec describes intent as of when it was written; PRs since
(including plain review-fix commits) may have moved the implementation.
Cross-check every claim it makes against step 1.

### 3 — Corroborate via tests

Read unit/integration tests, and E2E tests under `apps/front-e2e` if any
cover this feature. Use their assertions as evidence of enforced behavior
and as a source of concrete edge cases — never as the structural backbone
of the doc, and never assume any particular suite exists for a given
workflow (backend-only workflows like a cron job typically have no E2E
coverage at all).

### 4 — Surface disagreements and gaps, don't block on them

- Wherever source, spec, tests, and the requesting user's own account
  disagree, add a non-blocking ⚠️ callout in the draft noting the
  discrepancy. Never halt generation or silently pick a winner.
- Wherever a workflow moment has no test coverage in any suite, note it as
  a suggestion under "Limites connues" — propose the gap, don't write the
  missing test yourself.

### 5 — Fill the "why" gap conversationally

If, after steps 1–3, the product rationale is still missing, ask the
person invoking the skill directly rather than guessing.

### 6 — Plan screenshots

For each workflow moment that has a UI: attempt automated capture — start
the relevant dev server and drive it with the `playwright-cli` skill to
the right state, then capture it. If reaching that
state needs non-trivial setup (seeded data, multi-step flows), don't force
it — leave a placeholder describing exactly what to capture and where, for
the user to fill in by hand. Backend-only moments (cron, repair scripts)
get no screenshot — there's nothing to show.

### 7 — Draft the page in house style

Before writing blocks, fetch `notion://docs/enhanced-markdown-spec` via
`mcp__notion__notion-fetch` for the authoritative block syntax. The target
shape, learned from "Historique et notes" and "Génération de PDF":

- **Title** with a relevant emoji as the page icon.
- **Opening paragraph** — the big picture and the *why* (the product
  problem being solved), not an implementation summary.
- **Body organized by workflow moment**, narrative style (e.g. "Historique
  et notes"'s Filtrage → Agrégation → Ajout → Édition → Suppression) — not
  by rigid 5W headers. 5W (qui/quoi/quand/où/pourquoi) is a private
  completeness checklist while gathering facts in steps 1–5, never a
  visible section title — some W's don't map cleanly onto e.g. a headless
  cron job.
- **Blue callouts** (`<callout icon="💡" color="blue_bg">`) for key
  domain-term definitions.
- **One orange collapsible toggle**, titled "Note technique"
  (`<details color="orange_bg"><summary>...</summary>...</details>`),
  holding all implementation depth: code snippets, Mermaid diagrams,
  event/cron/schedule details, source links. This one toggle is what makes
  the page useful to both devs and product/support from a single artifact
  — keep it out of the main flow, not interleaved.
- **Screenshots** embedded inline under the relevant workflow-moment
  section (from step 6).
- Closes with **"Limites connues"** (real caveats + any suggested missing
  test coverage) and/or **"Annexes"** (links to specs — flagged "peut être
  obsolète, vérifier le code" — and to source files).

### 8 — Preview, then publish

1. Show the full draft to the requesting user before writing anything to Notion.
2. Search Notion (`mcp__notion__notion-search`, scoped under [Documentation fonctionnelle et technique](https://app.notion.com/p/zlv/Documentation-fonctionnelle-et-technique-3ad9ec2a056c80a7b37ccee62c2a9222)) for an existing page on the same topic.
   - Found → update it in place (`mcp__notion__notion-update-page`).
   - Not found → create a new child page (`mcp__notion__notion-create-pages`) under the section confirmed with the user — default inferred from the existing tree (e.g. "Fonctionnalités").
3. Report the final Notion page URL.

This makes the skill idempotent across re-runs as a feature's
implementation evolves after its doc was first published.

## Constants (ZLV-specific)

| Item | Value |
|---|---|
| Parent page | [Documentation fonctionnelle et technique](https://app.notion.com/p/zlv/Documentation-fonctionnelle-et-technique-3ad9ec2a056c80a7b37ccee62c2a9222) |
| Existing sections | Création de compte et connexion · Classifications/Codages · Fonctionnalités |
| Style references | [Historique et notes](https://app.notion.com/p/zlv/Historique-et-notes-2229ec2a056c80dabc99d52da3a2615c), [Génération de PDF](https://app.notion.com/p/zlv/G-n-ration-de-PDF-3219ec2a056c808193a5d3799fd6d22d) — copy their block conventions, not their content |

## Verify before reporting done

- [ ] Draft was shown and approved before any Notion write
- [ ] Any source/spec/test/user discrepancy is a non-blocking ⚠️ callout, not a silent choice
- [ ] Any workflow moment with no test coverage is noted under "Limites connues"
- [ ] Page has the right icon, sits under the right section, and its toggle holds all the technical depth (nothing implementation-specific leaked into the main flow)
