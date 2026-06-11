# Remove `frontend/src/components/_dsfr/`

Date: 2026-06-11
Branch: `refactor/remove-old-dsfr`

## Goal

Delete the legacy `frontend/src/components/_dsfr/` folder. Migrate every live consumer to the patterns mandated by `.claude/rules/frontend-conventions.md` (MUI primitives + DSFR direct usage) and remove the dead exports that have no consumers.

## Background

`_dsfr/` is a hand-rolled wrapper layer over DSFR primitives that predates the project's adoption of `@codegouvfr/react-dsfr` and `@mui/material`. The conventions file explicitly flags `_dsfr/` wrappers as legacy:

> Legacy → Current: `_dsfr/` wrappers → Direct DSFR components

Two live exports (`Text`, `Icon`) still have many consumers; the rest of the folder (`Modal*`, `Pagination*`, `Select*`, `SearchableSelect`, `Table*`, `SimpleTable`, plus `utils/` and `hooks/`) appears to be dead code.

## Replacement map

| Legacy `_dsfr` export | Replacement |
|---|---|
| `Container` | `@mui/material/Container` |
| `Row` | `@mui/material/Stack` (`direction="row"`); `@mui/material/Grid` (`container`) only if the file uses column sizing |
| `Col` | dissolves into parent `Stack`; or `@mui/material/Grid` (`size={…}`) paired with `Grid container` |
| `Text` | `@mui/material/Typography` — `as` → `component`, `size` → `variant` / `sx fontSize`, `bold` → `fontWeight`, `spacing` shortcut → `sx` margin/padding |
| `Icon` | `~/components/ui/Icon` |
| `TextAs` (type, 1 file) | inline `'p' \| 'span'` |

## Scope

- **15 consumer files** outside `_dsfr/` (live imports: `Col`, `Row`, `Container`, `Text`, `Icon`, `TextAs`).
- **Dead exports to verify, then delete**: `Modal*`, `Pagination*`, `Select*`, `SearchableSelect`, `Table*`, `SimpleTable`, plus `utils/`, `hooks/`. Verification = grep for relative paths *and* any `_dsfr` token across `frontend/src` and `apps/front-e2e`.
- **Out of scope**: refactoring legacy SCSS modules, `_app/` components, or `useForm` callers in touched files. Handle in follow-ups.

## Consumer → page map (visual-check checklist)

| # | Consumer file | Page(s) to open and visually check | URL |
|---|---|---|---|
| 1 | `views/Account/ForgottenPasswordView.tsx` | Forgotten password | `/mot-de-passe/oublie` |
| 2 | `views/Account/ResetPasswordView.tsx` | Reset password | `/mot-de-passe/nouveau` |
| 3 | `views/Account/AccountCreation/AccountPasswordCreationView.tsx` | Account creation — password step | `/inscription/*` |
| 4 | `views/Resources/ResourcesView.tsx` | Resources | `/ressources` |
| 5 | `views/Resources/StatusView.tsx` | Status (uses `MainContainer`) | `/ressources/statuts` |
| 6 | `components/MainContainer/MainContainer.tsx` | Same as #5 **and** Analysis views | `/ressources/statuts`, `/analyses/parc-vacant`, `/analyses/lutte` |
| 7 | `views/HousingList/HousingListMap.tsx` | Housing list — map mode | `/parc-de-logements` (map tab) |
| 8 | `components/HousingListFilters/HousingListFiltersSidemenu.tsx` | Housing list — open the filters side-menu | `/parc-de-logements` |
| 9 | `components/Collapse/Collapse.tsx` | Side-menu (#8), Map controls, `GeoPerimeterCard` | `/parc-de-logements` (sidemenu **and** map) |
| 10 | `components/GeoPerimeterCard/GeoPerimeterCard.tsx` | Side-menu (#8) + Map controls → "Périmètres" modal | `/parc-de-logements` (open *Périmètres* modal in sidemenu and in map) |
| 11 | `components/ExtendedToggle/ExtendedToggle.tsx` | Same as #8 (side-menu toggles) | `/parc-de-logements` |
| 12 | `components/GroupRemoveHousingModal/GroupRemoveHousingModal.tsx` | Used by `HousingListTab` → trigger "remove from group" | `/parc-de-logements` **and** `/groupes/:id` |
| 13 | `components/Label/Label.tsx` | Owner card / search / attachment, BuildingAside, HousingListMap, Account view | `/proprietaires/:id`, `/logements/:housingId` (right aside), `/compte`, `/parc-de-logements` (map mode) |
| 14 | `components/modals/ConfirmationModal/ConfirmationModal.tsx` | Reused by ~15 modals (owner edit, group rename/delete, campaign delete, document rename/delete, perimeter upload, user table, etc.). Spot check: rename a group, delete a campaign, rename a document. | `/groupes/:id`, `/campagnes/:id`, `/logements/:housingId`, `/utilisateurs` |
| 15 | `components/modals/GroupCampaignCreationModal/GroupCampaignCreationModal.tsx` | **No consumers found** — flag as orphaned. Migrate or delete during the *verify dead exports* step. | n/a |

## Execution shape — one PR, ordered commits

1. **`chore(front): verify _dsfr dead exports`** — grep `_dsfr/components/interface`, `_dsfr/utils`, `_dsfr/hooks`, and `GroupCampaignCreationModal` references; document findings in commit body. Delete confirmed-dead files. No consumer code changes yet.
2. **`refactor(front): migrate Icon to ui/Icon`** — Icon consumers.
3. **`refactor(front): migrate Text to MUI Typography`** — Text consumers + `TextAs` inlining.
4. **`refactor(front): migrate Container to MUI Container`** — Container consumers.
5. **`refactor(front): migrate Row/Col to Stack/Grid`** — grid consumers; pick `Grid` only where column sizing is used.
6. **`chore(front): remove _dsfr folder`** — delete `_dsfr/`, `index.js`, `index.d.ts`.

## Verification per commit

- `yarn nx typecheck frontend && yarn nx lint frontend && yarn nx test frontend`
- After commit 5: browser spot-check the consumer-page table above; tune `Typography variant` / `Stack spacing` per page when drift is visible. Acceptance = nothing visibly broken (no oversized headings, no missing spacing, no overlapping content); small font / margin drift is acceptable.
