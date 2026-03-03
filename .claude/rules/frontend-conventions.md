---
description: Frontend-specific directives for the React application
paths: ["frontend/**"]
---

# Frontend Conventions

## Styling — priority order
1. DSFR components (`@codegouvfr/react-dsfr`) for anything the design system covers.
2. MUI layout primitives (`Box`, `Stack`, `Grid`) for structure.
3. Emotion `styled()` from `@mui/material/styles` for reusable custom styles; `sx` prop for small one-off overrides.
- Never use SCSS modules — refactor to Emotion when touching a file that uses them.
- Never use inline styles.
- Never import from `@emotion/styled` directly.
- Never hardcode hex colors — use CSS variables from `src/colors.scss` or `fr.colors.*`.
- Spacing: explicit rem values (`"1rem"`), never MUI numeric multipliers (`spacing={2}`).

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

## Legacy → current (do not replicate legacy)
| Legacy | Current |
|--------|---------|
| SCSS modules | Emotion `styled()` |
| `useForm` hook | react-hook-form + yup |
| `_dsfr/` wrappers | Direct DSFR components |
| `_app/` components | `components/ui/` |
| Barrel MUI imports | Direct imports |
| Numeric MUI spacing | Explicit rem values |
