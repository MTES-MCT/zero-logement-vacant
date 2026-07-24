# Zéro Logement Vacant - Monorepo Development Guide

> **Note:** `CLAUDE.md` is a symlink to this file for backward compatibility with Claude Code.

## Project Overview

Yarn v4 monorepo with Nx for build orchestration and task running. French government application to track and reduce vacant housing.

**Stack:** TypeScript, React (frontend), Express (backend), PostgreSQL

## Accessibility (RGAA) — mandatory, non-negotiable

**Zéro Logement Vacant is a French public service.** Any frontend work MUST comply with **every single criterion** of the RGAA (Référentiel Général d'Amélioration de l'Accessibilité — France's WCAG 2.1 AA implementation: <https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/>), with no exceptions. This is a hard requirement, not a best-effort guideline — treat an RGAA violation with the same severity as a functional bug or a security issue.

Full rules, the 13 RGAA thematics broken down into actionable checks, and the mandatory self-review/alerting protocol are in [.claude/rules/rgaa-accessibility.md](.claude/rules/rgaa-accessibility.md). **Read and apply it for every change under `frontend/`.** You must proactively flag any suspected RGAA violation in your response — do not wait to be asked, and do not ship a known violation silently.

## Monorepo Structure

```
├── frontend/          # React app (@zerologementvacant/front)
├── server/            # Express API (@zerologementvacant/server)
├── apps/
│   └── front-e2e/    # End-to-end Cypress tests
└── packages/
    ├── api-sdk/       # API client
    ├── factories/     # Test factory functions (fishery)
    ├── models/        # Shared data models (DTOs)
    ├── pdf/           # PDF generation
    ├── schemas/       # Validation schemas
    ├── utils/         # Shared utilities
    └── healthcheck/   # Health check utilities
```

## Navigation Guide for AI Agents

**When to work in each workspace:**

- **Frontend work** (React components, UI, state management) → Work in `frontend/`; conventions in [.claude/rules/frontend-conventions.md](.claude/rules/frontend-conventions.md); accessibility is **mandatory** — see [.claude/rules/rgaa-accessibility.md](.claude/rules/rgaa-accessibility.md)
- **Backend work** (API endpoints, database, validation) → Work in `server/`; conventions in [.claude/rules/backend-conventions.md](.claude/rules/backend-conventions.md)
- **Shared types/models** → Work in `packages/models/` (DTOs used by both frontend and server)
- **Validation schemas** → Work in `packages/schemas/` (shared Yup schemas)
- **E2E tests** → Work in `apps/front-e2e/`

**AI agents automatically read the nearest AGENTS.md file in the directory tree.** Work in the appropriate workspace and follow its specific conventions.

## Essential Commands

**Run commands from root using Nx via Yarn:**

```bash
yarn nx <target> <project>              # Run specific task for project
yarn nx run-many -t <target>            # Run task for all projects
yarn nx run-many -t <target> --exclude=zero-logementvacant
```

**Available targets:** `build`, `test`, `typecheck`, `lint`, `dev`

**Examples:**

```bash
yarn nx test server                     # Test server only
yarn nx test server -- <file-pattern>   # Test specific files (vitest)
yarn nx build frontend                  # Build frontend
yarn nx dev front                       # Start frontend dev server (localhost:3000)
yarn nx dev server                     # Start backend dev server (localhost:3001/api)
yarn test                               # Test all (via nx run-many)
```

## Development Workflow

### 1. Environment Setup

Copy `.env.example` files in each workspace and configure.

### 2. Database

```bash
export DEV_DB=postgres://postgres:postgres@localhost/dev
export TEST_DB=postgres://postgres:postgres@localhost/test
bash .docker/setup.sh              # Setup DB + services
```

Or manually:

```bash
docker compose -f .docker/docker-compose.yml up -d
yarn workspace @zerologementvacant/server migrate
yarn workspace @zerologementvacant/server seed
```

### 3. Local Development

```bash
yarn nx dev front       # localhost:3000
yarn nx dev server      # localhost:3001/api
```

---

## 🤖 Mistral-Specific Workflow

> **Note:** This section defines **specific rules** for working with Mistral on the Zéro Logement Vacant project.

### 👥 Team Context
- **Project** : [Zéro Logement Vacant](https://zerologementvacant.beta.gouv.fr) (public digital service).
- **Stack** : Yarn v4 monorepo (Nx) with React (frontend), Express (backend), PostgreSQL.
- **Objective** : Develop **frontend features** from Figma mockups, with rigor and respect for conventions.

### 🚫 Absolute Prohibitions (for Mistral)
1. **❌ No commits** without **explicit** team agreement (e.g., *"commit", "make a commit"*).
2. **❌ No PRs** without **clear** consent (e.g., *"create a PR", "open a PR"*).
3. **❌ Never merge a PR** (even if requested).
4. **❌ No pushes** to `main`, `protected`, or any default branch.
5. **❌ No modifications** to code not requested (except critical blocking bugs).

### 🟢 Mandatory Workflow

#### 1️⃣ **Team Provides**
- Figma mockups (links or exports).
- Expected behaviors (interactions, edge cases).
- Business context (if necessary).

#### 2️⃣ **Mistral Develops Locally**
- **Frontend only** (React + TypeScript).
- **TDD mandatory** :
  - Tests **before** implementation (Vitest + `@fast-check/vitest`).
  - 1 test → 1 implementation → validation → repeat.
- **Strict respect** of conventions (see [Key Conventions](#-key-conventions)).
- **No commit/PR** without team validation.

#### 3️⃣ **Team Tests on localhost**
- Mistral will provide commands to launch the front:
  ```bash
  yarn nx dev front  # localhost:3000
  ```
- **Visual** (vs Figma) and **functional** validation.

#### 4️⃣ **If OK**
- Team says **"commit"** → Mistral makes a commit **in English** (e.g., `feat(housing): add vacancy filter`).
- Team says **"create a PR"** → Mistral creates a **draft PR** (never ready-for-review without agreement).
- Mistral provides the **PR link** for review.

---

### 📚 Mandatory Resources
- **Design Système de l'État (DSFR)** :
  - [Official Documentation](https://www.systeme-de-design.gouv.fr/version-courante/fr)
  - [Storybook DSFR](https://www.systeme-de-design.gouv.fr/v1.14/storybook/index.html?path=/)
  - [Vue DS (for reference)](https://docs.vue-ds.fr/guide/pour-commencer)
- **Tools** :
  - Figma (mockups to be provided).
  - [React DSFR (`@codegouvfr/react-dsfr`)](https://github.com/GouvernementFR/dsfr-react).

---

### 🎨 Key Conventions (Summary)

#### 📂 Frontend Structure
| Type | Location | Example |
|------|----------|---------|
| Shared components | `frontend/src/components/ui/` | `Button`, `Card` |
| Business components | `frontend/src/components/<Feature>/` | `HousingCard`, `CampaignList` |
| Views (pages) | `frontend/src/views/<Feature>/` | `HousingListView` |
| Unit tests | `components/<X>/test/<X>.test.tsx` | `HousingCard.test.tsx` |
| Integration tests | `views/<X>/test/<X>View.test.tsx` | `HousingListView.test.tsx` |

#### ⚛️ Development
- **Components** :
  - **DSFR priority** (`@codegouvfr/react-dsfr`).
  - **MUI** for layouts (`Box`, `Stack`, `Grid`).
  - **Emotion** (`styled()`) for custom styles (never SCSS).
- **Colors** :
  - **DSFR tokens** : `fr.colors.blueFranceMain525` (from `@codegouvfr/react-dsfr`).
  - **CSS variables** : `--blue-france-main-525` (from `frontend/src/colors.scss`).
  - ❌ **Never** hex codes (`#6a6af4` → `--blue-france-main-525`).
- **Spacing** :
  - Always in `rem` (e.g., `margin: "1rem"`).
  - ❌ **Never** `px` or `spacing={2}` (MUI).
- **Typography** :
  - Use DSFR components (`<Text>`, `<Title>`) with their props.

#### 📦 Imports
- **Alias** : `~` for `frontend/src/` (e.g., `import Button from '~/components/ui/Button'`).
- **MUI** : Direct imports (e.g., `import Box from '@mui/material/Box'`).
- **Workspace** : `@zerologementvacant/models`, `@zerologementvacant/schemas`, etc.

#### 🧪 Tests (TDD)
- **Framework** : **Vitest** (not Jest).
- **API Mocks** :
  - **MSW** (handlers in `src/mocks/handlers/`).
  - ❌ **Never** `vi.mock` for components (use `mockAPI.use()`).
- **Interactions** : `userEvent.setup()` (not `fireEvent`).
- **Fixtures** : Always extend `gen*DTO()` from `@zerologementvacant/models`.
- **Property-based tests** : `@fast-check/vitest` for validation schemas.

#### 🔤 Language
- **Code/Commits/PR** : **English** (e.g., `feat(housing): add filter`).
- **UI Text** : **French** with apostrophe `'` (U+2019), never `'` (U+0027).

#### 🧩 Forms
- **Hook** : `react-hook-form` + `yup` (resolver).
- **Validation** : Shared schemas in `@zerologementvacant/schemas`.
- ❌ **Never** legacy `useForm` (in `hooks/useForm.tsx`).

#### 🪟 Modals (DSFR)
- **Opening** : Imperative via `createModal` or `createConfirmationModal`.
- **Forms** : Always with `react-hook-form`.

---

### 📌 Additional Notes
- **Figma → Code** :
  - Mistral will translate mockups into **DSFR + MUI + Emotion** (no Tailwind).
  - **Visual** validation with team before finalizing.
- **Questions** :
  - Mistral will ask **short and precise** questions if something is unclear (e.g., *"Should the button be `primary` or `secondary`?"*).
- **Priorities** :
  1. Respect Figma mockups.
  2. Respect DSFR conventions.
  3. Functionality > Code perfection (refactor later if needed).

---

## Cross-Workspace Patterns

### Shared Code Location

**When to create shared code:**

- **Models/DTOs** → `packages/models/` when types are used by both frontend and server
  - Naming: `ExampleDTO`, `ExamplePayload` (no DTO suffix for payloads)
  - Example: `HousingDTO`, `HousingUpdatePayload`
- **Validation schemas** → `packages/schemas/` when validation is shared
  - Used by both server (API validation) and frontend (form validation)
- **Utilities** → `packages/utils/` for pure functions used across workspaces
- **Types** → Co-locate with implementation unless shared across workspaces

**Don't duplicate types!** Always check `packages/models/` first before creating new types.

### Package Import Conventions

```typescript
// Correct - importing shared DTOs
import { HousingDTO, OwnerDTO } from '@zerologementvacant/models';
import { housingUpdatePayload } from '@zerologementvacant/schemas';

// Frontend extends DTOs with parsed values
interface Housing extends HousingDTO {
  lastContact?: Date; // Parsed from ISO string
}

// Backend uses DTOs directly or creates API models
interface HousingApi extends HousingDTO {
  // Additional backend-specific fields
}
```

### Test Fixture Pattern (CRITICAL)

**All test fixtures must extend shared DTOs:**

- **Backend:** `genHousingApi()` must call/extend `genHousingDTO()` from `@zerologementvacant/models`
- **Frontend:** `genHousing()` must call/extend `genHousingDTO()` from `@zerologementvacant/models`
- **Anything not following this pattern is legacy and should be refactored**

Example:

```typescript
// In @zerologementvacant/models
export function genHousingDTO(): HousingDTO { ... }

// In server tests
export function genHousingApi(): HousingApi {
  return {
    ...genHousingDTO(),  // Extend shared DTO
    // Add backend-specific fields
  };
}

// In frontend tests
export function genHousing(): Housing {
  return {
    ...genHousingDTO(),  // Extend shared DTO
    // Add parsed/frontend-specific fields
  };
}
```

## Testing Strategy

**Test-Driven Development (TDD) is mandatory:**

- **Tests MUST be written BEFORE implementation**
- Write failing tests first, then implement to make them pass

**Framework:**

- **All apps and packages use Vitest** (not Jest!)
- Any workspace still using Jest is legacy or forced to do so for compatibility reasons
- E2E tests use **Cypress**

**Property-based testing:**

- **Must use `@fast-check/vitest`** for:
  - API input validation tests
  - Schema validation tests
  - Any test validating data structures

**Test file locations:**

- API endpoint tests: `src/controllers/test/<name>-api.test.ts`
- Repository tests: `src/repositories/test/<name>Repository.test.ts`
- Component tests: Co-located with components

**Running tests:**

```bash
yarn nx test <project>                  # Test specific workspace
yarn nx test <project> -- <pattern>     # Filter by file pattern
yarn test                               # Test all workspaces
```

## Dependencies

**Package manager:** Yarn v4 (requires Node v24)

**Adding dependencies:**

```bash
yarn workspace @zerologementvacant/<workspace> add <package>
```

**Security:** Use `npq` for dependency auditing:

```bash
npx npq install <package-name>     # Checks vulnerabilities before install
```

## CI/CD

GitHub Actions runs E2E tests on PRs. See badge in README.

**Environments:**

- Staging: <https://zerologementvacant-staging.incubateur.net>
- Production: <https://zerologementvacant.beta.gouv.fr>

## Common Pitfalls

1. **Wrong command** → Always use `yarn nx`, never run `nx` directly
2. **Wrong test runner** → All workspaces use Vitest (not Jest) unless forced by compatibility
3. **Duplicating types** → Always check `packages/models/` before creating new types
4. **Missing env vars** → Each workspace needs its own `.env` file
5. **DB not migrated** → Run migrations after pulling: `yarn workspace @zerologementvacant/server migrate`
6. **Using `yarn test` in workspace** → Use `yarn nx test <project>` from root instead
7. **Not following TDD** → Write tests BEFORE implementation
8. **Legacy test fixtures** → Ensure all fixtures extend `gen*DTO()` from `@zerologementvacant/models`

## Git Hooks

Husky configured for pre-commit linting. Configured via `.husky/`.

## Git Conventions

- **Commit messages**: Always in English
- **PR titles and descriptions**: Always in English
- **Branch naming**: Use prefixes like `feat/`, `fix/`, `chore/`, `refactor/`

## Pull Request Workflow

After opening any PR with `gh pr create`, always:

1. Add relevant labels from the existing label set (check with `gh label list` if unsure)
2. Assign the PR to the user: `gh pr edit <number> --add-label "<labels>" --add-assignee "@me"`

## Workspace-Specific Documentation

- **Frontend conventions** → [.claude/rules/frontend-conventions.md](.claude/rules/frontend-conventions.md)
- **RGAA accessibility (mandatory for all frontend work)** → [.claude/rules/rgaa-accessibility.md](.claude/rules/rgaa-accessibility.md)
- **Backend conventions** → [.claude/rules/backend-conventions.md](.claude/rules/backend-conventions.md)
- **Packages conventions** → [.claude/rules/packages-conventions.md](.claude/rules/packages-conventions.md)

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
