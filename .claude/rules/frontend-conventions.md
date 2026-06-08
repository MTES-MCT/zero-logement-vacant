---
description: Frontend-specific directives for the React application
paths: ["frontend/**"]
---

# Frontend Conventions

## Styling — priority order
1. DSFR components (`@codegouvfr/react-dsfr`) for anything the design system covers.
2. MUI layout primitives (`Box`, `Stack`, `Grid`) for structure.
3. Emotion `styled()` from `@mui/material/styles` for custom styles.
- Never use SCSS modules — refactor to Emotion when touching a file that uses them.
- Never use inline styles.
- Never import from `@emotion/styled` directly.
- Never hardcode hex colors — use CSS variables from `src/colors.scss` or `fr.colors.*`.
- Never use CSS variables in TSX `sx` props or `styled()` — use `fr.colors.*` from `import { fr } from '@codegouvfr/react-dsfr'` instead.
- Spacing: explicit rem values (`"1rem"`), never MUI numeric multipliers (`spacing={2}`).
- Never use `px` units — always use `rem` (e.g. `borderRadius: '0.25rem'` not `'4px'`).
- Stack: use `direction="row"` prop directly, never `sx={{ flexDirection: 'row' }}`.

## Imports
- MUI: direct imports only. `import Box from '@mui/material/Box'`, not `import { Box } from '@mui/material'`.
- Internal: use `~` alias (`~/components/...`).

## Components
- `Readonly<Props>` for all prop types. Functional components only.
- New shared components → `components/ui/`. Never add to `_app/` (legacy).
- New DSFR wrappers → forbidden. Use DSFR components directly.

## State
- RTK Query for server state. Redux slices for global UI state. Context + hook for scoped state.
- `useState` for local component state only.

## Forms
- react-hook-form + yup resolver for all new forms.
- Never use the legacy `useForm` hook from `hooks/useForm.tsx`.

## Testing
- MSW handlers in `src/mocks/handlers/`. Fixtures extend `gen*DTO()`.
- The MSW server instance is `mockAPI` from `~/mocks/mock-api` (created via `setupServer(...handlers)`). **Never** import a `server` variable — it does not exist.
- Global handlers live in `src/mocks/handlers/<feature>-handlers.ts` and are registered for every test automatically. Override per-test with `mockAPI.use(handler)` — MSW's `afterEach` reset restores the global handlers after each test.
- **Never use `vi.mock` to mock React components** for the purpose of intercepting network data. Use `mockAPI.use()` for that. `vi.mock` is reserved for non-network dependencies that genuinely cannot run in jsdom (e.g. `Map`, `RichEditor`).
- The MSW server is started automatically by Vitest setup — never call `server.listen()` / `server.close()` manually in test files.
- Always use `userEvent.setup()` for user interactions — never call `fireEvent` directly.
  ```typescript
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /confirm/i }));
  ```
- Tests follow Arrange → Act → Assert with a blank line between each block.
- Every new user flow requires two levels of tests:
  1. **Unit test** in a `test/` directory next to the component (`components/<Feature>/test/ComponentName.test.tsx`).
  2. **View-level integration test** in `views/<Feature>/test/<FeatureView>.test.tsx` — covers the full flow from button click to API call, following the pattern in `GroupViewNext.test.tsx`.

## DSFR modals
- Opened imperatively via the object returned by `createModal` or `createConfirmationModal` — never through state.
- For modals that submit a form (date input, confirmation with action), use `createConfirmationModal` from `@codegouvfr/react-dsfr/Modal`.
- Always use `react-hook-form` to handle form state and validation inside modals.

## French text
- Always use the French apostrophe `’` (U+2019), never the English straight apostrophe `'` (U+0027) in user-facing strings.

## Legacy → current (do not replicate legacy)
| Legacy | Current |
|--------|---------|
| SCSS modules | Emotion `styled()` |
| `useForm` hook | react-hook-form + yup |
| `_dsfr/` wrappers | Direct DSFR components |
| `_app/` components | `components/ui/` |
| Barrel MUI imports | Direct imports |
| Numeric MUI spacing | Explicit rem values |
