# Figma MCP Integration Rules

These rules define how to translate Figma inputs into code for this project and must be followed for every Figma-driven change.

## Project Context

This is a French government application (Zéro Logement Vacant) using:
- **Primary UI:** `@codegouvfr/react-dsfr` (DSFR – Design Système de l'État)
- **Secondary UI:** `@mui/material` with Emotion (`@mui/material/styles`)
- **Language:** TypeScript + React
- **Build:** Vite + SWC

---

## Required Figma-to-Code Flow (do not skip)

1. Run `get_design_context` first to fetch the structured representation for the exact node(s)
2. If response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`
3. Run `get_screenshot` for a visual reference of the node variant being implemented
4. Download any required assets from the localhost source returned by the MCP server
5. Translate the output (usually React + Tailwind) into this project's conventions (DSFR + MUI + Emotion)
6. Validate against the Figma screenshot for 1:1 visual parity before marking complete

---

## Component Organization

- **Shared/reusable UI components** → `frontend/src/components/ui/` (legacy components in `_app/` are being migrated here)
- **DSFR wrappers** → `frontend/src/components/_dsfr/` (legacy, avoid adding new ones)
- **Feature components** → `frontend/src/components/<FeatureName>/` (e.g., `Housing*`, `Campaign*`, `Group*`)
- **Page-level views** → `frontend/src/views/`
- All component names use **PascalCase**
- Tests are co-located with components (`*.test.tsx`)

---

## Styling Rules

- **Primary approach:** MUI's `styled()` from `@mui/material/styles` for new components
  ```typescript
  import { styled } from '@mui/material/styles';
  const StyledBox = styled(Box)(({ theme }) => ({ padding: theme.spacing(2) }));
  ```
- **DSFR tokens:** Use `fr.colors.*` and `fr.spacing()` from `@codegouvfr/react-dsfr` for design-system-aligned values
- **Legacy SCSS modules:** Existing `.module.scss` files may be present; use Emotion when editing those components
- **IMPORTANT:** Never hardcode hex colors — use CSS variables from `frontend/src/colors.scss` or DSFR tokens
  ```typescript
  // Correct
  color: 'var(--blue-france-main-525)'
  // Wrong
  color: '#6a6af4'
  ```
- Spacing uses **explicit rem values** (not MUI numeric multipliers) unless using `theme.spacing()`

---

## Design Token Reference

**Colors** (defined in `frontend/src/colors.scss` as CSS variables):
- Blue France: `--blue-france-main-525`, `--blue-france-113`, `--blue-france-850`, `--blue-france-925`, `--blue-france-950`, `--blue-france-975`
- Red Marianne: `--red-marianne-main-472`, `--red-marianne-425`, `--red-marianne-625`, `--red-marianne-975`
- Grey: `--grey-main-525`, `--grey-425`, `--grey-625`, `--grey-975`, `--grey-950`, `--grey-925`
- State colors: `--info-main-525`, `--success-main-525`, `--warning-main-525`, `--error-main-525`
- Base: `--black-50`, `--white-1000`

**Theme:** `frontend/src/theme.tsx` — uses `createMuiDsfrThemeProvider` integrating MUI + DSFR

---

## Import Conventions

- **Path alias:** `~` maps to `frontend/src/`
  ```typescript
  import SomeComponent from '~/components/ui/SomeComponent/SomeComponent';
  import { useHousing } from '~/hooks/useHousing';
  ```
- **Workspace packages:**
  ```typescript
  import { HousingDTO } from '@zerologementvacant/models';
  import { housingUpdatePayload } from '@zerologementvacant/schemas';
  ```
- **MUI:** Use direct imports (not barrel):
  ```typescript
  import Box from '@mui/material/Box';   // Correct
  import { Box } from '@mui/material';   // Avoid
  ```

---

## Component Reuse Guidelines

Before creating a new component, check for existing equivalents:
- **Buttons, badges, alerts, inputs:** Use DSFR components from `@codegouvfr/react-dsfr`
- **Layout (Grid, Stack, Box):** Use MUI layout primitives
- **Custom shared components:** Check `frontend/src/components/ui/` first (`_app/` is legacy)
- **Icons:** Use `@codegouvfr/react-dsfr` icons or existing SVGs — **IMPORTANT: do not install new icon packages**

---

## Asset Handling

- **IMPORTANT:** If the Figma MCP server returns a `localhost` source for an image or SVG, use that source directly
- **IMPORTANT:** Do not create placeholders if a localhost source is provided
- Store downloaded static assets in `frontend/public/` or `frontend/src/assets/`
- SVG icons should be imported as React components when possible

---

## Implementation Rules

- Treat Figma MCP output (React + Tailwind) as a **design reference**, not final code
- Replace Tailwind utility classes with Emotion `styled()` or DSFR tokens
- Reuse existing components from `frontend/src/components/_app/` and DSFR before creating new ones
- Follow project's state management pattern: RTK Query for server state, Redux Toolkit for UI state
- Routing uses `react-router-dom` with French kebab-case routes (e.g., `/parc-de-logements`)
- Forms use `react-hook-form` + `yup` validation schemas from `@zerologementvacant/schemas`
- Validate the final UI against the Figma screenshot for both look and behavior
