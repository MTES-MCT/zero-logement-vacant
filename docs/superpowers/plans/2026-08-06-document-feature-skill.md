# Document-Feature Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `document-feature` skill that turns a ZLV feature's source code, design spec (if any), and tests into a French-language Notion documentation page in the established house style — then use it once, for real, to publish the campaign sending-date-gated housing status workflow.

**Architecture:** A single project skill file, `.claude/skills/document-feature/SKILL.md`, encoding a fallback source-of-truth hierarchy (code always → spec if present, treated as stale → tests as corroboration → the user conversationally for gaps) and a house-style content recipe (plain-language body organized by workflow moment, one collapsible "Note technique" toggle for implementation depth). Its correctness is validated the way a Technique skill is validated per `superpowers:writing-skills` — not RED/GREEN pressure scenarios (this isn't a discipline-enforcing rule), but a real application scenario: Task 2 dogfoods the skill against the actual campaign sending-date feature and the skill gets refined if that run surfaces a gap.

**Tech Stack:** Notion MCP tools (`mcp__notion__*`), the `playwright-cli` skill for screenshot automation, existing repo source (TypeScript/server, React/frontend).

## Global Constraints

- All Notion content is written in French.
- Never run `git commit` without asking the user first, even mid-task — this overrides writing-plans' default "commit at the end of every task" convention, per the user's global CLAUDE.md ("only commit when explicitly asked").
- Never write anything to Notion before showing the full draft to the requesting user and getting their go-ahead.
- Reference spec: `docs/superpowers/specs/2026-08-06-document-feature-skill-design.md` — resolve any ambiguity against it.

---

### Task 1: Author the `document-feature` skill

**Files:**
- Create: `.claude/skills/document-feature/SKILL.md`

**Interfaces:**
- Produces: a skill discovered by intent-match on its frontmatter `description`; other agents follow its numbered "Steps" section as the contract. No code-level function signatures are involved.

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p .claude/skills/document-feature`

- [ ] **Step 2: Write the skill file**

Create `.claude/skills/document-feature/SKILL.md` with exactly this content:

```markdown
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
```

- [ ] **Step 3: Validate frontmatter**

Run: `sed -n '1,8p' .claude/skills/document-feature/SKILL.md`
Expected: `name: document-feature` (letters/hyphens only) and a `description` field starting with "Use when" content, both present between the two `---` lines.

- [ ] **Step 4: Placeholder scan**

Run: `grep -niE "\bTBD\b|\bTODO\b|fill in|implement later" .claude/skills/document-feature/SKILL.md`
Expected: no matches.

- [ ] **Step 5: Ask before committing**

Ask the user: "Skill file written — commit it now?" Only run the following if they say yes:

```bash
git add .claude/skills/document-feature/SKILL.md
git commit -m "feat: add document-feature skill for Notion documentation"
```

---

### Task 2: Apply the skill — publish the campaign sending-date Notion page

**Files (read-only unless noted):**

The campaign sending-date feature lives on a different branch/worktree
(`feat/campaign-sending-date-status`, not yet merged to `main`) than this
plan's own worktree. Read all source and spec files below under the prefix
`/Users/inad/dev/zero-logement-vacant.feat-campaign-sending-date-status/` —
do not look for them in this task's own worktree, and do not modify them.

- `server/src/services/campaign-housing-service.ts`
- `server/src/controllers/campaignController.ts`
- `server/src/repositories/eventRepository.ts`
- `server/src/scripts/repairs/campaign-sending-date.ts`
- `server/src/scripts/flip-sent-campaign-housings/task.ts` and `index.ts`
- `clevercloud/cron.json`
- `frontend/src/components/Campaign/CampaignSentAtModal.tsx` and its test
- `docs/superpowers/specs/2026-07-15-campaign-sending-date-status-design.md`
- `docs/superpowers/specs/2026-07-23-campaign-sending-date-revert-design.md`
- `docs/superpowers/specs/2026-07-08-zlv-repair-harness-design.md`
- Scratch draft (write here, in this task's own workspace, not the other worktree): `campaign-sending-date-notion-draft.md` in the path the dispatch prompt gives you.

**Interfaces:**
- Consumes: the Steps 1–8 defined in Task 1's `SKILL.md`.
- Produces: a published Notion page URL (no code interface — this task's output is documentation, not a function).

- [ ] **Step 1: Read current source for all four workflow moments**

Read, in full:
- `server/src/controllers/campaignController.ts` (`createFromGroup` and `update` handlers — the immediate-flip gating on `sentAt`)
- `server/src/services/campaign-housing-service.ts` (the shared flip/revert function)
- `server/src/scripts/flip-sent-campaign-housings/task.ts` and `index.ts` (the daily cron logic)
- `server/src/scripts/repairs/campaign-sending-date.ts` (the backfill/repair harness)
- `server/src/repositories/eventRepository.ts` (system-attributed event authorship for the revert)
- `clevercloud/cron.json` (confirm the cron schedule/frequency actually configured)

Take note, in your own working memory (no file needed yet), of: exactly when each flip/revert fires, what event types are created, and whether the running code matches what step 2 below expects it to say.

- [ ] **Step 2: Cross-check against the three specs — flag discrepancies, don't stop**

Read the three specs listed above. For each claim they make about current behavior, compare against Step 1's findings. Write down (again, just working memory or a scratch note) any place where the spec and the code disagree — these become ⚠️ callouts in the draft, not blockers.

- [ ] **Step 3: Check test coverage per workflow moment**

Run:
```bash
grep -rln "sentAt\|sending.date\|sendingDate" apps/front-e2e/cypress 2>/dev/null
grep -rln "sentAt" server/src/controllers/test/campaign-api.test.ts server/src/services/test/campaign-housing-service.test.ts server/src/scripts/flip-sent-campaign-housings/test/ server/src/scripts/repairs/test/campaign-sending-date.test.ts
```
For each of the four workflow moments (creation flip, update flip, cron flip, postpone revert), confirm whether it has: a server unit/integration test (expected: yes, per the design specs' "Testing" sections) and/or an E2E test (expected: likely no, since this is mostly backend-driven — the postpone-revert front-end warning in `CampaignSentAtModal.test.tsx` is the one moment with real UI). Note any workflow moment with zero coverage in any suite — this becomes a "Limites connues" suggestion.

- [ ] **Step 4: Read the front-end warning UI precisely**

Read `frontend/src/components/Campaign/CampaignSentAtModal.tsx` and `frontend/src/components/Campaign/test/CampaignSentAtModal.test.tsx` in full. Extract the exact warning copy shown to the user and the exact condition that triggers it (per the git log: "warn before postponing an already-sent campaign", "warn about the postpone-revert only once the sending date is reached").

- [ ] **Step 5: Decide the screenshot plan**

Two workflow moments have a UI worth showing: the `CampaignSentAtModal` postpone warning, and a housing's status badge changing (Non suivi → En attente de retour, and back). Attempt automated capture:
1. Start the frontend dev server: `yarn workspace @zerologementvacant/front dev` (background).
2. Use the `playwright-cli` skill to reach a campaign with a housing attached and a past `sentAt`, open the sending-date modal, and set a future date to trigger the warning — capture that state.
3. Capture a housing list/detail view showing the status badge, if reachable without complex seeding.

If reaching either state needs non-trivial data seeding beyond what a quick local DB seed provides, stop and leave a placeholder in the draft describing exactly what to capture and where, rather than forcing it.

- [ ] **Step 6: Draft the page content**

Write the full page content to the scratch file `campaign-sending-date-notion-draft.md`, in French, following Task 1's Step 7 structure exactly:
- Title + emoji (e.g. "📬 Bascule automatique des logements à la date d'envoi").
- Opening paragraph: the big picture/why (housings were flipping to "En attente de retour" before the mailing had gone out).
- Sections per workflow moment: Bascule à la création d'une campagne / Bascule lors de la modification de la date d'envoi / Bascule automatique quotidienne / Report de la date d'envoi (retour en arrière) — with screenshots or placeholders from Step 5, and blue callouts defining "Non suivi" / "En attente de retour" / "date d'envoi".
- Orange "Note technique" toggle: cron schedule (from Step 1), event types + system attribution, the repair/backfill harness, any ⚠️ discrepancy callouts from Step 2.
- "Limites connues": real caveats (e.g. up to 24h cron lag) + the coverage gap from Step 3, if any.
- "Annexes": links to the three specs (marked "peut être obsolète, vérifier le code") and to the source files from Step 1.

- [ ] **Step 7: Show the draft to the user and get approval**

Present the full drafted content (or its rendered Markdown) to the user. Wait for explicit approval or requested changes before proceeding. Loop back to Step 6 if changes are requested.

- [ ] **Step 8: Fetch the authoritative Notion block syntax**

Call `mcp__notion__notion-fetch` with `id: "notion://docs/enhanced-markdown-spec"`. Translate the approved Step 7 content into that block syntax (callouts, details/summary toggle, headings, image blocks).

- [ ] **Step 9: Search Notion for an existing page on this topic**

Call `mcp__notion__notion-search` with `page_url` scoped to `https://app.notion.com/p/zlv/Documentation-fonctionnelle-et-technique-3ad9ec2a056c80a7b37ccee62c2a9222` and a query like "bascule statut logement date d'envoi campagne". If a matching page exists, plan to update it (`mcp__notion__notion-update-page`); otherwise plan to create it under "Fonctionnalités" (confirm with the user first if the section choice is unclear).

- [ ] **Step 10: Publish**

Create (or update) the Notion page with the translated content from Step 8, using `mcp__notion__notion-create-pages` (or `notion-update-page` if Step 9 found an existing page).

- [ ] **Step 11: Report the result**

Report the final Notion page URL to the user, along with a one-line summary of any ⚠️ discrepancies or coverage gaps surfaced along the way.

- [ ] **Step 12: Run the skill's own verify checklist**

Confirm all four items in the skill's "Verify before reporting done" section are true for the page just published. If any is false, fix it before considering this task done.

---

## Execution Handoff

Two ways to run this:

1. **Subagent-driven (recommended for Task 1)** — dispatch a fresh subagent to write and self-check the skill file, review its output, then move to Task 2.
2. **Inline execution (recommended for Task 2)** — Task 2 needs the specs/source context already gathered in this conversation, plus live, interactive tool calls (browser automation, Notion MCP, a user-approval checkpoint) that are awkward to hand to a context-free subagent.

Given the two tasks have different shapes, running Task 1 via `subagent-driven-development` and Task 2 via `executing-plans` in this session is a reasonable split — confirm with the user before proceeding either way.
