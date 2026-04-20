# Claude Automation — Rules & Implement-Feature Skill

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create 4 directive convention rule files, one `implement-feature` orchestration skill, and prune AGENTS.md files of prescriptive content that moves into rules.

**Architecture:** Rules own all directives (do/don't, mandatory patterns). AGENTS.md becomes purely documentary (reference, examples, architecture). The skill sequences existing skills — zero convention content inside it.

**Tech Stack:** Claude Code rules (`.claude/rules/`), Claude Code skills (`.claude/skills/`)

---

### Task 1: `general-conventions.md` rule

**Files:**
- Create: `.claude/rules/general-conventions.md`

**Step 1: Write the file**

```markdown
---
description: General conventions applying to all workspaces
---

# General Conventions

## Language & tooling
- All code in TypeScript. Avoid plain JS for new files.
- Package manager: Yarn v4. Never use npm or pnpm.
- Task runner: `yarn nx <target> <project>`. Never run `nx` directly.
- Test runner: Vitest everywhere. Never use Jest unless a workspace is forced to for compatibility.

## Code style
- `const` for all variable declarations.
- `function` keyword for named functions that are not one-liners.
- Destructure props in the function body.
- No try-catch in route handlers — async errors are caught by the framework.

## Shared packages — check before creating
- Types/DTOs → `packages/models/`
- Validation schemas → `packages/schemas/`
- Pure utilities → `packages/utils/`
- Never duplicate a type or utility that already exists in a shared package.

## Test fixtures (critical)
- All fixtures must extend `gen*DTO()` from `@zerologementvacant/models`.
- Never duplicate DTO fields in a fixture function.

## TDD — mandatory, no exceptions
- Write the failing test before any implementation code.

## Git
- Commit messages and PR titles in English.
- UI text, routes, and validation messages in French.
- Never edit `.env` files (only `.env.example`).
```

**Step 2: Commit**

```bash
git add .claude/rules/general-conventions.md
git commit -m "ai: add general-conventions rule"
```

---

### Task 2: `frontend-conventions.md` rule

**Files:**
- Create: `.claude/rules/frontend-conventions.md`

**Step 1: Write the file**

```markdown
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
```

**Step 2: Commit**

```bash
git add .claude/rules/frontend-conventions.md
git commit -m "ai: add frontend-conventions rule"
```

---

### Task 3: `backend-conventions.md` rule

**Files:**
- Create: `.claude/rules/backend-conventions.md`

**Step 1: Write the file**

```markdown
---
description: Backend-specific directives for the Express API
paths: ["server/**"]
---

# Backend Conventions

## Implementation order — mandatory
Router → Controller test → Controller → Repository test → Repository

## Validation
- Always in routers, never in controllers.
- Use `validatorNext.validate()` with Yup schemas.
- Never use express-validator for new code (legacy).
- Property-based tests mandatory for all schemas (`@fast-check/vitest`).

## Controllers
- Naming: `list`, `get`, `create`, `update`, `remove`.
- No try-catch — throw custom `HttpError` subclasses.
- Use `constants` from `node:http2` for status codes, never raw numbers.

## Repositories
- Use Knex query builder. Never raw SQL in repositories.
- Always apply `notDeleted()` for soft deletes.
- Transactions: `startTransaction()` in controllers, `withinTransaction()` in repos. Never start transactions in repositories.

## Testing
- API tests: `controllers/test/*-api.test.ts` with supertest.
- Assert with primitive table accessors (`Events()`, `Housings()`), not the repository under test.
- Fixtures extend `gen*DTO()` from `@zerologementvacant/models`.

## Legacy → current (do not replicate legacy)
| Legacy | Current |
|--------|---------|
| express-validator | validatorNext (Yup) |
| try-catch in controllers | Throw `HttpError` subclass |
| Direct Knex in controllers | Repositories |
| Transactions in repositories | `startTransaction()` in controllers |
| Raw HTTP status numbers | `constants.HTTP_STATUS_*` from `node:http2` |
```

**Step 2: Commit**

```bash
git add .claude/rules/backend-conventions.md
git commit -m "ai: add backend-conventions rule"
```

---

### Task 4: `packages-conventions.md` rule

**Files:**
- Create: `.claude/rules/packages-conventions.md`

**Step 1: Write the file**

```markdown
---
description: Conventions for shared packages (models, schemas, utils, draft)
paths: ["packages/**"]
---

# Packages Conventions

## packages/models
- DTOs: `HousingDTO`, `OwnerDTO` (DTO suffix).
- Payloads: `HousingUpdatePayload` (no DTO suffix).
- Every entity must export a `gen*DTO()` fixture function.
- Frontend and server fixtures must extend these.

## packages/schemas
- Yup schemas shared across workspaces.
- Naming: camelCase, no suffix (`housingUpdatePayload` not `housingUpdatePayloadSchema`).
- Property-based tests mandatory (`@fast-check/vitest`).

## packages/utils
- Pure functions only. No side effects, no framework dependencies.
- Only add utilities used by 2+ workspaces.

## packages/draft
- Experimental — do not depend on stability.

## Cross-package changes
- After changes to `models/` or `schemas/`, run `yarn nx run-many -t typecheck`.
```

**Step 2: Commit**

```bash
git add .claude/rules/packages-conventions.md
git commit -m "ai: add packages-conventions rule"
```

---

### Task 5: Prune `frontend/AGENTS.md`

Remove or condense sections that are now owned by rules, keeping AGENTS.md as reference documentation (patterns, examples, architecture).

**Files:**
- Modify: `frontend/AGENTS.md`

**Sections to prune:**
- "Common Pitfalls" section → remove entirely (covered by `frontend-conventions.md` legacy table)
- Remove prescriptive "do/don't" bullets from "Styling Guide" → keep examples only
- "Legacy patterns to avoid" block in Styling Guide → remove (covered by rule)

**Keep intact:**
- All code examples and patterns (Context + hook, RTK Query service, MSW handlers, etc.)
- File structure, naming conventions (descriptive, not prescriptive)
- Quick reference at top
- Key dependencies table

**Step 1: Read the file and make targeted edits**

Read `frontend/AGENTS.md`, identify the exact "Common Pitfalls" and legacy-pattern prescriptive blocks, and remove them.

**Step 2: Commit**

```bash
git add frontend/AGENTS.md
git commit -m "ai: remove prescriptive pitfalls from frontend AGENTS.md (moved to rules)"
```

---

### Task 6: Prune `server/AGENTS.md`

Same principle — remove prescriptive pitfall lists, keep reference documentation.

**Files:**
- Modify: `server/AGENTS.md`

**Sections to prune:**
- "Common Pitfalls" section → remove entirely (covered by `backend-conventions.md` legacy table)
- Any prescriptive "don't" bullets in validation/controller/repository sections → remove, keep examples

**Step 1: Read and make targeted edits**

**Step 2: Commit**

```bash
git add server/AGENTS.md
git commit -m "ai: remove prescriptive pitfalls from server AGENTS.md (moved to rules)"
```

---

### Task 7: `implement-feature` skill

**Files:**
- Create: `.claude/skills/implement-feature/SKILL.md`

**Step 1: Create directory and write skill**

```markdown
---
name: implement-feature
description: >
  ZLV feature development workflow orchestrator.
  Use when starting any frontend, backend, or fullstack feature.
  Inputs: optional Figma URL, optional PO ticket/instructions.
  Brainstorming is mandatory when no instructions are provided.
---

# Implement Feature — ZLV Workflow

## Inputs
- **Figma URL** — required for frontend or fullstack features
- **PO instructions / ticket** — optional; if absent, brainstorming is mandatory
- **Scope** — `frontend` | `backend` | `fullstack`

## Steps

### 1 — Read the design (if Figma URL present)
Use `figma:implement-design` to fetch design context and screenshot before anything else.

### 2 — Brainstorm
- No PO instructions → `superpowers:brainstorming` is **mandatory**. Block until user approves design.
- PO instructions present → offer brainstorming. If user declines, confirm understanding before proceeding.

### 3 — Plan
Use `superpowers:writing-plans`. Save to `docs/plans/YYYY-MM-DD-<feature>.md`.

### 4 — TDD
Use `superpowers:test-driven-development`. All failing tests written before any implementation.

### 5 — Implement
For frontend or fullstack:
- Use `vercel-react-best-practices` before writing React components.
- Use `vercel-composition-patterns` when designing component APIs.
- Follow `figma-design-system.md` rule for styling.

For backend or fullstack:
- Follow the mandatory order: router → controller → repository.

### 6 — Verify
Use `superpowers:verification-before-completion`.
For frontend: visual comparison with Figma screenshot is required.

### 7 — Review
Use `superpowers:requesting-code-review`.
```

**Step 2: Commit**

```bash
git add .claude/skills/implement-feature/SKILL.md
git commit -m "ai: add implement-feature orchestration skill"
```

---

### Task 8: Verify

**Step 1: Check all files exist**

```bash
ls .claude/rules/
ls .claude/skills/implement-feature/
```

Expected output:
```
.claude/rules/: backend-conventions.md  figma-design-system.md  frontend-conventions.md  general-conventions.md  packages-conventions.md
.claude/skills/implement-feature/: SKILL.md
```

**Step 2: Spot-check frontmatter**

```bash
head -5 .claude/rules/frontend-conventions.md
head -5 .claude/rules/backend-conventions.md
```

Expected: `paths:` key in frontmatter (not `globs:`).
