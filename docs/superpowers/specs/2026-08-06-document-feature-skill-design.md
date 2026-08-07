# `document-feature` Skill — Design Spec

**Date:** 2026-08-06
**Status:** Approved

## Problem

ZLV's functional/technical documentation lives in Notion, under "⛑️ Documentation fonctionnelle et technique." Two existing pages ("Historique et notes", "Génération de PDF") establish a house style that works for a small team spanning both product/support and engineering: plain-language sections up front, technical depth tucked into a collapsible toggle. Nothing currently produces new pages in that style — each one so far has been hand-written.

The immediate trigger is the campaign sending-date-gated housing status workflow (a housing flips from "Non suivi" to "En attente de retour" only once a campaign's `sentAt` is reached, with an automatic revert if the date is postponed). This needs documenting. But not every workflow has a design spec backing it the way this one does, so the mechanism for producing the doc needs to work without one.

Two existing Notion-publishing skills are close precedents but don't fit:

- `publish-lovac-report` — one-shot, deterministic, reads local report files. No judgment calls, no prose synthesis.
- `mise-en-production` — synthesizes PR history into a release note. Tied to a specific deploy event, not a durable "how does X behave" reference.

## Decision: a new skill, `document-feature`

Intent-triggered (phrases like "documente cette feature dans Notion", "écris la doc fonctionnelle de X"), following `mise-en-production`'s pattern rather than an explicit slash command with positional args — the inputs (which feature, which spec if any, which section) are conversational and don't map cleanly to fixed CLI-style arguments.

### Sources of truth — a fallback hierarchy, not a single input

Design specs go stale even when they exist — this very branch has a spec superseded by a later one, plus three post-spec "review fix" commits. E2E tests would couple the doc to test wording and would miss backend-only workflows (a daily cron job has no UI, so likely no Cypress coverage). So the skill reads, in this order, and does **not** block generation on any single source being absent or contradictory:

1. **Source code, always** — controllers/services/migrations/cron config are the only thing that can't lie about _current_ behavior. This step never gets skipped, spec or no spec.
2. **Design spec, if one exists** (e.g. `docs/superpowers/specs/*.md`) — mined for _why_ (rationale, rejected alternatives, edge cases already thought through), treated as presumptively stale and cross-checked against #1, never trusted blindly.
3. **Tests (unit/integration/E2E, whichever exist)** — read for their _assertions_ as corroborating evidence and concrete scenarios, not as the doc's structural backbone. Never assumed to exist.
4. **The invoking user, conversationally** — for the "why" gap code can't answer, when spec + code + tests leave one.

Where these sources disagree, the skill adds a non-blocking ⚠️ callout inline noting the discrepancy rather than halting or silently picking one. Where a workflow moment has no test coverage in any suite, the skill notes the gap as a suggestion in "Limites connues" — it proposes, it doesn't author new tests itself.

### Content structure (house style, learned from the two existing pages)

- Page title carries a relevant emoji, as a Notion page icon.
- Opens with a plain-language paragraph: the big picture and the _why_ (the product problem being solved), not an implementation summary.
- Body is organized **by workflow moment**, narrative style — mirroring "Historique et notes"'s Filtrage → Agrégation → Ajout → Édition → Suppression pattern — not by rigid 5W headers. (5W — who/what/when/where/why — is used privately as a completeness checklist while gathering facts, never as visible section titles; some W's don't map cleanly onto e.g. a headless cron job.)
- **Blue callouts** (💡) for key domain-term definitions, matching existing usage.
- **Orange collapsible "Note technique" toggle** holding implementation depth: code snippets, Mermaid diagrams, event/cron/schedule details, source links. This is what makes the page equally useful to devs and to product/support from a single artifact.
- **Screenshots embedded inline** under the relevant workflow-moment section, wherever a UI exists for that moment.
- Closes with **"Limites connues"** (real caveats, plus any suggested missing test coverage) and/or **"Annexes"** (links to specs — flagged "peut être obsolète, vérifier le code" — and to source files), following whichever the two examples used for that kind of content.

### Screenshot sourcing

When a workflow moment has a UI, the skill attempts automated capture: start the relevant dev server and drive it via browser automation (Playwright/Claude-in-Chrome) to reach the state and capture it. If the state requires complex setup (data seeding, multi-step flows) the automated path isn't worth forcing — the skill instead leaves a placeholder describing precisely what to capture and where, for the user to fill in by hand. Backend-only workflow moments (e.g. the cron flip itself) get no screenshot — there's nothing to show.

### Publish flow

1. Draft full page content and show it as a preview before writing anything to Notion.
2. Search Notion (scoped under "Documentation fonctionnelle et technique") for an existing page on the same topic. If found, update it in place; otherwise create a new child page under the section confirmed with the user (default inferred from the existing tree, e.g. "Fonctionnalités").
3. Report the final Notion page URL.

This makes the skill idempotent across re-runs as a feature's implementation evolves after its doc was first published — the common case for anything that, like this one, gets amended by follow-up PRs.

## First deliverable

Using this skill, produce the Notion page for the campaign sending-date-gated housing status workflow: creation-time flip, update-time flip, the daily cron flip, and the postpone-to-future revert (including system-attributed events). Source material: `2026-07-15-campaign-sending-date-status-design.md`, `2026-07-23-campaign-sending-date-revert-design.md`, `2026-07-08-zlv-repair-harness-design.md` (backfill mechanism), current server source (`campaign-housing-service.ts`, `campaignController.ts`, `eventRepository.ts`, the repair under `scripts/repairs/campaign-sending-date.ts`), and `CampaignSentAtModal.tsx` + its test for the front-end warning UI.

## What this does not cover

- Authoring new E2E or unit tests to close gaps the skill notices — it only flags them.
- A generic "keep Notion in sync automatically" mechanism (e.g. a hook firing on merge) — every use is an explicit, conversational invocation.
- Retrofitting the two existing example pages to any new convention — they remain as-is, used only as style reference.
