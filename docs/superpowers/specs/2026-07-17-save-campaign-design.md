# Save a Campaign from the Campaigns List — Design Spec

**Date:** 2026-07-17
**Scope:** Frontend only
**Ticket:** [GEN-1431] [Campagnes] Enregistrer une campagne

## Context

Today, a campaign can only be created from a single group's detail page (`/groupes/:id`), via a "Créer une campagne" button that opens `CreateCampaignFromGroupModal`. There is no way to create a campaign directly from the campaigns list page (`/campagnes`) — the user first has to find and open the right group.

This feature adds a "Enregistrer une campagne" button to the campaigns list, which opens a 2-step modal: step 1 lets the user search for and select a group, step 2 reuses the existing campaign-creation form to create the campaign from that group.

## User Story

As a [user], I want to save a campaign from the campaigns list, in order to convert a group into a campaign.

## Mockups

Three Figma frames (file `kfEYtoHqhonLyCDTcDm5wu`):
- `16477:53770` — Campaigns list page, new "Enregistrer une campagne" button in the toolbar.
- `16477:62849` — Step 1 modal: "Sélectionner le groupe de logements".
- `16477:64023` — Step 2 modal: "Créer une campagne" (existing form + new stepper).

## Existing Building Blocks (confirmed by codebase survey)

- `frontend/src/components/Group/CreateCampaignFromGroupModal.tsx` — the existing campaign-creation modal. Takes `group: Group` + `onSubmit(campaign)`, built on `createConfirmationModal`. Fields: Nom (required), Description (optional), Date d'envoi (optional). Already exactly matches step 2's needs — no logic changes required.
- `frontend/src/services/campaign.service.ts` — `useCreateCampaignFromGroupMutation` → `POST /groups/:id/campaigns`. The only campaign-creation endpoint that exists; campaigns can only ever be created from a group.
- `frontend/src/components/Campaign/CampaignTable.tsx` — renders the campaigns list and its toolbar (a `Stack` with `justifyContent: space-between` showing the "X campagnes" count, with empty space on the right — the natural slot for the new button).
- `frontend/src/components/modals/HousingCreationModal/HousingCreationModal.tsx` — the one existing multi-step-modal precedent in the codebase: two separate `createExtendedModal`/`createConfirmationModal` instances, chained via a parent component's `useState` + `.close()`/`.open()` pairs.
- `frontend/src/services/group.service.ts` — `useFindGroupsQuery()` (`GET /groups`) returns the establishment's full group list, unfiltered — no server-side search parameter exists today.
- DSFR's `Stepper` (`@codegouvfr/react-dsfr/Stepper`) — used today only in full-page account-creation views, never inside a modal. Its API (`currentStep`, `stepCount`, `title`, `nextTitle`) matches the mockup's stepper exactly.
- `frontend/src/components/AdvancedTable/AdvancedTable.tsx` — the shared table component with built-in pagination, used by `CampaignTable.tsx` and `GeoPerimetersTable.tsx`. Its default pagination footer is what the step-1 mockup shows.

## Decisions Made During Brainstorming

1. **Group search is client-side.** `GET /groups` has no search param and none will be added — filter the already-fetched, unfiltered list in the browser (matches the existing `PerimetersModal` pattern). No backend changes.
2. **Excluded groups:** archived groups and groups with `housingCount === 0` are excluded entirely from the results (not shown, not just disabled) — mirrors the existing disabled state of "Créer une campagne" on the group page.
3. **Pagination is real, not decorative.** The table shows *all* matching/eligible groups, paginated 5/page via `AdvancedTable`'s existing pagination — not just a top-5 cutoff.
4. **Sort order:** most recently created first (`createdAt` descending).
5. **Default state (no search yet):** all eligible groups are shown, paginated, immediately when step 1 opens.
6. **Search trigger:** submit-only (`AppSearchBar`'s `onSearch`, fired on button click or Enter) — no live filter-as-you-type.
7. **Modal architecture:** two separate, fully independent modal instances (step 1: new `SelectGroupModal`; step 2: existing `CreateCampaignFromGroupModal` unmodified) chained via a parent's `useState`, mirroring `HousingCreationModal.tsx` exactly. Considered and rejected a single-modal-with-internal-step-switch approach (avoids a possible close/reopen flicker, but requires extracting the existing modal's form into a headless component) in favor of simplicity and reuse of already-shipped code.
8. **No back button** from step 2 to step 1 — Annuler/Fermer/click-outside on step 2 closes the entire flow rather than returning to step 1 (matches the ticket's spec text; deliberately differs from `HousingCreationModal`'s back-button precedent).
9. **Post-creation behavior:** on success, close the modal, show a toast ("La campagne a été ajoutée"), and stay on `/campagnes` (list auto-refreshes via the existing `invalidatesTags` on the `Campaign` list). Deliberately differs from the group-page flow (`GroupView.tsx`), which navigates to the new campaign's detail page — this flow keeps the user on the page they started from, per the Figma annotation on the "Confirmer" button.

## Architecture

**Entry point:** a new `Button` ("Enregistrer une campagne", primary/MD, icon-left) added to the existing toolbar `Stack` in `CampaignTable.tsx`. No changes to `CampaignListView.tsx`.

**New files:**
- `frontend/src/components/Campaign/SelectGroupModal.tsx` — exports `createSelectGroupModal()`, a `createExtendedModal` (no confirm footer — selection happens per-row). Renders: `Stepper` (step 1/2), `AppSearchBar` (submit-only), `AdvancedTable` of eligible groups with a "Sélectionner" action column.
- `frontend/src/components/Campaign/SaveCampaignFlow.tsx` — orchestrator component, parallel to `HousingCreationModal.tsx`. Creates both modal instances, holds `selectedGroup` state, wires the step transition and the submit handler. Mounted directly inside `CampaignTable.tsx`, self-contained (no prop drilling from `CampaignListView.tsx`).

**Modified file:**
- `frontend/src/components/Group/CreateCampaignFromGroupModal.tsx` — add one optional prop, e.g. `stepper?: { currentStep: number; stepCount: number }`, rendering a `Stepper` at the top of the modal content when present. Omitted (no behavior change) for the existing `GroupNext.tsx` call site; passed `{ currentStep: 2, stepCount: 2 }` from the new flow. Purely additive — no changes to the existing schema, fields, or submit logic.

## Data Flow

**Step 1 — search & select:**
1. `useFindGroupsQuery()` (existing, unchanged) fetches all establishment groups.
2. Filter to eligible groups: `archivedAt === null && housingCount > 0`.
3. If `searchText` is set (updated only on `AppSearchBar` submit/Enter), filter further by case-insensitive substring match on `title`.
4. Sort by `createdAt` descending.
5. Render via `AdvancedTable`, which paginates 5/page natively.
6. Clicking a row's "Sélectionner" button calls `handleGroupSelected(group)`.

**Step transition:**
```
handleGroupSelected(group):
  setSelectedGroup(group)
  selectGroupModal.close()
  campaignFromGroupModal.open()
```

**Step 2 — create:**
1. Existing form (unchanged): Nom (required), Description (optional), Date d'envoi (optional).
2. On submit: `useCreateCampaignFromGroupMutation({ campaign: payload, group: selectedGroup })`.
3. On success: toast "La campagne a été ajoutée", close modal, reset `selectedGroup`/`searchText`/pagination, stay on `/campagnes`.
4. On failure: error toast, modal stays open with form data intact for retry.

**Reset on cancel:** step 1 resets its own search/pagination state on close (Fermer). Step 2's reset-on-close behavior is already handled by the existing modal.

## Error Handling

- `useFindGroupsQuery` failure or empty/no-match result: reuse the existing generic table error/empty-state convention (no new pattern invented).
- `useCreateCampaignFromGroupMutation` failure: error toast; modal stays open with data intact.

## Testing (TDD — written before implementation)

- `SelectGroupModal.test.tsx`: excludes archived/empty groups; substring search is case-insensitive; results sorted by `createdAt` descending; 5/page pagination; "Sélectionner" fires the callback with the correct group; empty/no-match state renders.
- `SaveCampaignFlow.test.tsx`: button opens step 1; selecting a group closes step 1 and opens step 2 with that group; submit calls the mutation with `{ campaign, group }`, shows the success toast, closes the modal, does not navigate; mutation failure keeps the modal open and shows an error toast.
- `CreateCampaignFromGroupModal.test.tsx` (existing file): add a case for the new `stepper` prop rendering/not-rendering — regression guard for the existing group-page flow.
- No backend tests — frontend-only, reusing existing endpoints unmodified.

## Accessibility (RGAA)

To verify explicitly during implementation against `.claude/rules/rgaa-accessibility.md`, not deferred to review:
- `Stepper` ARIA semantics when used inside a modal (first such usage in the codebase).
- Search input label association (`AppSearchBar`).
- Table header scoping (`AdvancedTable`).
- Focus management across the two chained modal instances (focus should land sensibly in step 2 after step 1 closes).

## Out of Scope

- Any backend/API changes (`GET /groups` search, new campaign-creation endpoints).
- Changing the group-page ("Créer une campagne" from `/groupes/:id`) flow's behavior.
- A "back" button from step 2 to step 1.
