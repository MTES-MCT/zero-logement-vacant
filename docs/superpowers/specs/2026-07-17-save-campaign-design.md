# Save a Campaign from the Campaigns List — Design Spec

**Date:** 2026-07-17
**Scope:** Frontend + one backend authorization guard
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
3. **Pagination is real, not decorative.** The table shows _all_ matching/eligible groups, paginated 5/page via `AdvancedTable`'s existing pagination — not just a top-5 cutoff.
4. **Sort order:** most recently created first (`createdAt` descending).
5. **Default state (no search yet):** all eligible groups are shown, paginated, immediately when step 1 opens.
6. **Search trigger:** submit-only (`AppSearchBar`'s `onSearch`, fired on button click or Enter) — no live filter-as-you-type.
7. **Modal architecture:** two separate, fully independent modal instances (step 1: new `SelectGroupModal`; step 2: existing `CreateCampaignFromGroupModal` unmodified) chained via a parent's `useState`, mirroring `HousingCreationModal.tsx` exactly. Considered and rejected a single-modal-with-internal-step-switch approach (avoids a possible close/reopen flicker, but requires extracting the existing modal's form into a headless component) in favor of simplicity and reuse of already-shipped code.
8. **No back button** from step 2 to step 1 — Annuler/Fermer/click-outside on step 2 closes the entire flow rather than returning to step 1 (matches the ticket's spec text; deliberately differs from `HousingCreationModal`'s back-button precedent).
9. **Post-creation behavior:** on success, close the modal, show a toast ("La campagne a été ajoutée"), and stay on `/campagnes` (list auto-refreshes via the existing `invalidatesTags` on the `Campaign` list). Deliberately differs from the group-page flow (`GroupView.tsx`), which navigates to the new campaign's detail page — this flow keeps the user on the page they started from, per the Figma annotation on the "Confirmer" button.
10. **Only Usual/Admin can create campaigns — fixed at the backend, for both entry points.** The codebase survey found that campaign creation has _no_ role check anywhere today: neither the existing "Créer une campagne" button (`GroupNext.tsx`) nor the endpoint it calls (`POST /groups/:id/campaigns`) restrict by role, so a VISITOR can currently create a campaign. Since both the existing and the new flow share that endpoint, the fix is applied at the backend (authoritative) and mirrored on both frontend entry points — a frontend-only check would leave the API callable directly by a Visitor.
11. **Visitors don't see either "create campaign" button at all** (not shown-disabled) — matches the existing hide-based convention for permission gating elsewhere (`DocumentsTab.tsx`, `HousingView.tsx`), as opposed to the disabled-with-tooltip pattern which has no precedent in this codebase for permission (as opposed to data-availability) gating.
12. **Scope of the guard is creation only.** `PUT/DELETE /campaigns/:id` (update, delete, send) have the same missing-role-check gap but are explicitly out of scope for this ticket — flagged as a separate follow-up, not fixed here.

## Architecture

**Entry point:** a new `Button` ("Enregistrer une campagne", primary/MD, icon-left) added to the existing toolbar `Stack` in `CampaignTable.tsx`, rendered only when `isAdmin || isUsual` (via `useUser()`) — hidden entirely for VISITOR. No changes to `CampaignListView.tsx`.

**New files:**

- `frontend/src/components/Campaign/SelectGroupModal.tsx` — exports `createSelectGroupModal()`, a `createExtendedModal` (no confirm footer — selection happens per-row). Renders: `Stepper` (step 1/2), `AppSearchBar` (submit-only), `AdvancedTable` of eligible groups with a "Sélectionner" action column.
- `frontend/src/components/Campaign/SaveCampaignFlow.tsx` — orchestrator component, parallel to `HousingCreationModal.tsx`. Creates both modal instances, holds `selectedGroup` state, wires the step transition and the submit handler. Mounted directly inside `CampaignTable.tsx`, self-contained (no prop drilling from `CampaignListView.tsx`).

**Modified files:**

- `frontend/src/components/Group/CreateCampaignFromGroupModal.tsx` — add one optional prop, e.g. `stepper?: { currentStep: number; stepCount: number }`, rendering a `Stepper` at the top of the modal content when present. Omitted (no behavior change) for the existing `GroupNext.tsx` call site; passed `{ currentStep: 2, stepCount: 2 }` from the new flow. Purely additive — no changes to the existing schema, fields, or submit logic.
- `frontend/src/components/Group/GroupNext.tsx` — wrap the existing "Créer une campagne" `FullWidthButton` in `const { isAdmin, isUsual } = useUser(); const canCreateCampaign = isAdmin || isUsual;`, hiding it entirely (not just disabling) for VISITOR. Same one-line convention as `DocumentsTab.tsx`/`HousingView.tsx`.
- `server/src/routers/protected.ts` — add `hasRole([UserRole.USUAL, UserRole.ADMIN])` middleware to the `POST /groups/:id/campaigns` route (~line 295), matching the existing convention used for documents/notes/housing-update routes. This is the authoritative fix; it protects both the existing group-page flow and the new list-page flow since they share this endpoint. No other campaign routes are touched (see Decisions #12 and Out of Scope).

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
- 403 from the new `hasRole` guard: shouldn't be reachable through the UI (the button is hidden for VISITOR), but if hit directly (e.g. stale session, role changed mid-session) it's just another mutation failure — same error-toast handling as above, no special case needed.

## Testing (TDD — written before implementation)

- `SelectGroupModal.test.tsx`: excludes archived/empty groups; substring search is case-insensitive; results sorted by `createdAt` descending; 5/page pagination; "Sélectionner" fires the callback with the correct group; empty/no-match state renders.
- `SaveCampaignFlow.test.tsx`: button opens step 1; selecting a group closes step 1 and opens step 2 with that group; submit calls the mutation with `{ campaign, group }`, shows the success toast, closes the modal, does not navigate; mutation failure keeps the modal open and shows an error toast.
- `CreateCampaignFromGroupModal.test.tsx` (existing file): add a case for the new `stepper` prop rendering/not-rendering — regression guard for the existing group-page flow.
- `CampaignTable.test.tsx` / `GroupNext.test.tsx`: assert the respective "create campaign" button is absent for a VISITOR user and present for USUAL/ADMIN, using the existing `useUser`-mocking convention from `DocumentsTab.test.tsx`/`HousingView.test.tsx`.
- `server/src/routers/test/protected.test.ts` (or wherever `hasRole` is tested for other routes, e.g. `auth.test.ts`'s pattern): add a case asserting `POST /groups/:id/campaigns` returns 403 for a VISITOR and succeeds for USUAL/ADMIN.

## Accessibility (RGAA)

To verify explicitly during implementation against `.claude/rules/rgaa-accessibility.md`, not deferred to review:

- `Stepper` ARIA semantics when used inside a modal (first such usage in the codebase).
- Search input label association (`AppSearchBar`).
- Table header scoping (`AdvancedTable`).
- Focus management across the two chained modal instances (focus should land sensibly in step 2 after step 1 closes).

## Out of Scope

- Backend/API changes beyond the one `hasRole` guard on `POST /groups/:id/campaigns` — no `GET /groups` search endpoint, no new campaign-creation endpoints.
- Extending the Usual/Admin-only guard to `PUT/DELETE /campaigns/:id` (update, delete, send) — same pre-existing gap, explicitly deferred as a follow-up (Decision #12).
- Changing the group-page ("Créer une campagne" from `/groupes/:id`) flow's behavior, beyond adding the same permission guard (Decision #10/#11).
- A "back" button from step 2 to step 1.
