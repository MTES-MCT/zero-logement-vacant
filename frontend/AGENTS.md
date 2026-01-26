# Frontend Development Guide

> **Note:** `CLAUDE.md` is a symlink to this file for backward compatibility with Claude Code.

## Quick Reference

**Adding a form?** Use react-hook-form + yup ([Form Handling](#form-handling))

**Need API data?** Use RTK Query hooks ([API Integration](#api-integration))

**Styling a component?** Use styled components with Emotion ([Styling Guide](#styling-guide))

**Creating a component?** Check naming conventions and file structure below

## Project Structure

```
frontend/src/
├── components/          # Reusable UI components (60+ directories)
│   ├── _app/           # App-specific custom components (AppSelect, AppLink, etc.)
│   ├── Housing*/       # Housing-related components
│   ├── Owner/          # Owner-related components
│   └── ...             # Feature-based organization
├── views/              # Page-level components
├── services/           # RTK Query API endpoints (*.service.ts)
├── hooks/              # Custom React hooks (use*.tsx)
├── store/              # Redux store configuration
├── layouts/            # Layout wrappers (AuthenticatedLayout, GuestLayout)
├── models/             # TypeScript interfaces and utilities
├── utils/              # Helper utilities and configuration
├── mocks/              # MSW mock handlers for testing
└── test/               # Test utilities and setup
```

## File Naming Conventions

- **Components:** PascalCase (e.g., `HousingEditionSideMenu.tsx`, `OwnerKindTag.tsx`)
- **Hooks:** `use*` pattern (e.g., `useHousing.tsx`, `useNotification.ts`)
- **Services:** `*.service.ts` (e.g., `housing.service.ts`, `owner.service.ts`)
- **Tests:** `*.test.ts` or `*.test.tsx` (co-located with source files)
- **Mocks:** `*-handlers.ts` in `src/mocks/handlers/`

## Styling Guide

### When to use what

**For component-scoped styles (DEFAULT):**

- Use **styled components with Emotion** from `@mui/material/styles`
- Modern, type-safe, theme-aware approach
- Example:

  ```typescript
  import { styled } from '@mui/material/styles';
  import Box from '@mui/material/Box';

  const StyledBox = styled(Box)(({ theme }) => ({
    padding: '1rem',
    backgroundColor: theme.palette.background.paper
  }));
  ```

**For layout and UI components:**

- Use **MUI Material components** with default imports (not barrel imports)
- ✅ Correct: `import Typography from '@mui/material/Typography'`
- ❌ Avoid: `import { Typography } from '@mui/material'`
- Why: Efficient bundling, faster builds
- Common components: `Grid`, `Stack`, `Typography`, `Box`
- Spacing: Use explicit rem values like `spacing="1rem"`, avoid numeric multipliers like `spacing={2}`

**For French government design compliance:**

- Primary: Use **DSFR components** directly from `@codegouvfr/react-dsfr`
- Secondary: Use **custom specialized components** based on DSFR
  - Example: `OwnerKindTag` is a specialized `Tag` based on DSFR
- Design tokens:
  - Colors: `fr.colors.*` for DSFR-compliant colors
  - Spacing: Use explicit rem values like `spacing="1rem"`
- Note: `src/components/_dsfr/` wrappers are **legacy** and scheduled for removal

**Legacy patterns to avoid:**

- ❌ SCSS modules (`.module.scss`) - legacy, use styled components instead
- ❌ Inline styles - avoid unless absolutely necessary
- ❌ Emotion/styled imports from `@emotion/styled` - use `@mui/material/styles` instead

### Migration note

When editing components with SCSS modules, consider refactoring to styled components.

## Component Architecture

### Organization Pattern

- Feature-based grouping (e.g., `Housing*/`, `Owner/`, `Draft/`)
- Shared/reusable components in `_app/` (e.g., `AppSelect`, `AppLink`, `AppBadge`)
- Page-level components in `views/`

### When to create vs edit

- **Create new component** when building reusable UI element or feature-specific component
- **Edit existing component** when modifying behavior or fixing bugs
- **Check for existing** before creating - many specialized components already exist

### Common Patterns

**Context + Custom Hook Pattern:**

```typescript
// hooks/useHousing.tsx
const HousingContext = createContext<HousingContextValue | null>(null);

export function HousingProvider(props: HousingProviderProps) {
  const { data: housing, ...getHousingQuery } = useGetHousingQuery(props.housingId);
  const value = useMemo(() => ({ housing, housingId, getHousingQuery }), [housing, housingId, getHousingQuery]);
  return <HousingContext.Provider value={value}>{props.children}</HousingContext.Provider>;
}

export function useHousing() {
  const context = useContext(HousingContext);
  assert(context !== null, 'useHousing must be used within HousingProvider');
  return context;
}
```

## State Management

### Redux + Redux Toolkit (RTK)

**Store structure** ([store/store.tsx](store/store.tsx)):

```typescript
export const store = configureStore({
  reducer: {
    app: appReducer,
    authentication: authenticationReducer,
    housing: housingReducer,
    loadingBar: loadingBarReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(zlvApi.middleware)
});
```

### RTK Query for API Layer

**Base API** ([services/api.service.ts](services/api.service.ts)):

- Uses `createApi` with `fetchBaseQuery`
- Tag-based cache invalidation (18+ tag types)
- Auto-generated hooks: `use<Action><Resource>Query/Mutation`

**Example service pattern:**

```typescript
// services/housing.service.ts
export const housingApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getHousing: builder.query<Housing, string>({
      query: (housingId) => `housing/${housingId}`,
      transformResponse: parseHousing,
      providesTags: (result) => [{ type: 'Housing', id: result.id }]
    }),
    updateHousing: builder.mutation<HousingDTO, HousingUpdatePayload>({
      query: ({ id, ...payload }) => ({
        url: `housing/${id}`,
        method: 'PUT',
        body: payload
      }),
      invalidatesTags: ['HousingByStatus', 'HousingCountByStatus']
    })
  })
});

export const { useGetHousingQuery, useUpdateHousingMutation } = housingApi;
```

### When to use what state management

- **RTK Query** - API data fetching, caching, mutations
- **Redux slices** - Global app state (auth, UI preferences)
- **Context providers** - Scoped state (current housing, form context)
- **useState** - Local component state

## Form Handling

### Preferred: react-hook-form + yup (Modern)

```typescript
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, string, number } from 'yup';

const schema = object({
  occupancy: string().required('Veuillez renseigner l\'occupancy').oneOf(OCCUPANCY_VALUES),
  status: number().required('Veuillez renseigner le statut')
});

type FormSchema = InferType<typeof schema>;

function MyComponent() {
  const form = useForm<FormSchema>({
    values: { occupancy: 'VACANT', status: 1 },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const onSubmit = form.handleSubmit(async (data) => {
    // Handle submission
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        {/* Form fields */}
      </form>
    </FormProvider>
  );
}
```

### Legacy: useForm Hook (Deprecated)

- Location: [hooks/useForm.tsx](hooks/useForm.tsx)
- Status: **Deprecated** - avoid for new code
- Uses Yup schema validation
- Returns: `isDirty`, `isValid`, `hasError()`, `message()`, `validate()`

### Validation Patterns

**French error messages:**

```typescript
const emailValidator = yup
  .string()
  .required('Veuillez renseigner votre adresse email.')
  .email("L'adresse email est invalide.");
```

## API Integration

### Adding New RTK Query Endpoints

1. **Create or update service file** (e.g., `services/housing.service.ts`)
2. **Inject endpoints** into base API using `zlvApi.injectEndpoints()`
3. **Export auto-generated hooks** at bottom of file

### Auth Header Injection

**Automatic** - configured in [services/api.service.ts](services/api.service.ts):

```typescript
prepareHeaders: (headers) => authService.withAuthHeader(headers);
```

### Error Handling with Notifications

**useNotification hook pattern:**

```typescript
import { useNotification } from '../hooks/useNotification';

function MyComponent() {
  const [updateHousing, updateHousingMutation] = useUpdateHousingMutation();

  useNotification({
    isLoading: updateHousingMutation.isLoading,
    isSuccess: updateHousingMutation.isSuccess,
    isError: updateHousingMutation.isError,
    toastId: 'update-housing',
    message: {
      loading: 'Sauvegarde en cours...',
      success: 'Logement mis à jour',
      error: 'Erreur lors de la mise à jour'
    }
  });

  return <button onClick={() => updateHousing(payload)}>Sauvegarder</button>;
}
```

## Testing

### Framework & Tools

- **Vitest** - Test runner (not Jest!)
- **React Testing Library** - Component testing
- **happy-dom** - Lightweight DOM environment
- **MSW (Mock Service Worker)** - API mocking

### Test Setup

**Global setup** ([setupTests.ts](src/setupTests.ts)):

```typescript
import '@testing-library/jest-dom';
import 'jest-extended';
import { mockAPI } from './mocks/mock-api';

beforeAll(() => {
  mockAPI.listen({ onUnhandledRequest: 'error' });
});
```

### Mock API Handlers

**Location:** `src/mocks/handlers/`

**Example handler:**

```typescript
// mocks/handlers/housing-handlers.ts
import { http, HttpResponse } from 'msw';

// Types omitted for brievity
const get = http.get('/api/housing/:id', ({ params }) => {
  return HttpResponse.json(genHousing({ id: params.id }));
});

const update = http.put('/api/housing/:id', async ({ request }) => {
  const payload = await request.json();
  return HttpResponse.json({ ...payload, id: params.id });
});

export const housingHandlers = [get, update];
```

### Test Fixture Pattern (CRITICAL)

**All frontend test fixtures must extend shared DTOs:**

```typescript
// ❌ WRONG - Legacy pattern
export function genHousing(): Housing {
  return {
    id: faker.string.uuid()
    // ... duplicate all fields
  };
}

// ✅ CORRECT - Extend shared DTO
import { genHousingDTO } from '@zerologementvacant/models';

export function genHousing(): Housing {
  return {
    ...genHousingDTO(), // Extend shared DTO
    // Add frontend-specific parsed fields
    lastContact: new Date(),
    energyConsumptionAt: new Date()
  };
}
```

### Test-Driven Development (TDD)

**Tests MUST be written BEFORE implementation:**

1. Write failing test first
2. Implement to make it pass
3. Refactor if needed

### Example Test Structure

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should display housing information', () => {
    const housing = genHousing();

    render(<MyComponent housing={housing} />);

    expect(screen.getByText(housing.rawAddress[0])).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
yarn nx test frontend                    # Run all frontend tests
yarn nx test frontend -- MyComponent     # Filter by pattern
```

## Routing

**Framework:** React Router v6

**Structure:** Defined in [App.tsx](src/App.tsx)

**Two main layouts:**

- `AuthenticatedLayout` - Protected routes requiring authentication
- `GuestLayout` - Public routes (login, signup, password reset)

**Route conventions:**

- French-named routes: `/parc-de-logements`, `/proprietaires`, `/logements`, `/campagnes`
- Kebab-case path segments
- Dynamic segments: `/logements/:housingId`, `/proprietaires/:id`

## Type Patterns

### Model Conventions

**Shared DTOs:**

```typescript
import { HousingDTO, OwnerDTO } from '@zerologementvacant/models';
```

**Frontend models extend DTOs:**

```typescript
// Frontend model with parsed dates
interface Housing extends HousingDTO {
  // Any frontend-specific property
}
```

**Payloads (no DTO suffix):**

```typescript
import { HousingUpdatePayload } from '@zerologementvacant/models';
```

### Type Utilities

- `ts-essentials` - Utility types (`DeepReadonly`, `MarkRequired`, etc.)
- `ts-pattern` - Pattern matching: `match(value).with(...).otherwise(...)`
- `effect` - FP utilities (pipe, arrays...) and predicates

## Key Dependencies

| Category          | Library                        | Usage                          |
| ----------------- | ------------------------------ | ------------------------------ |
| **State**         | @reduxjs/toolkit               | Redux store, RTK Query         |
| **Forms**         | react-hook-form, yup           | Form handling, validation      |
| **UI**            | @mui/material                  | Components, layouts, theme     |
| **Design**        | @codegouvfr/react-dsfr         | French gov design system       |
| **Routing**       | react-router-dom               | Client-side routing            |
| **Notifications** | react-toastify                 | Toast notifications            |
| **Maps**          | maplibre-gl, react-map-gl      | Map visualization              |
| **Rich Text**     | lexical, @lexical/react        | Rich text editor               |
| **Testing**       | vitest, @testing-library/react | Testing framework              |
| **Mocking**       | msw                            | API mocking                    |
| **Utils**         | effect, ts-pattern, lodash-es  | FP utilities, pattern matching |
| **Dates**         | date-fns                       | Date manipulation              |

## Language & Conventions

**Language:** French

- All UI text in French
- Routes in French: `/parc-de-logements`, `/proprietaires`
- Validation messages in French
- Comments in French or English

**Code Style:**

- `const` for all variable declarations
- `function` keyword wherever possible, if not a one-liner
- Destructuring for props in the component body
- `Readonly<Props>` for component props
- Functional components only (no class components)

## Build & Development

- **Build tool:** Vite with SWC (fast compilation)
- **Dev server:** `localhost:3000`
- **API endpoint:** `localhost:3001/api` (configurable via [utils/config.ts](src/utils/config.ts))

## Common Pitfalls

1. **SCSS modules** → Use styled components instead (legacy pattern)
2. **Barrel imports** → Use default imports: `import Box from '@mui/material/Box'`
3. **Numeric spacing** → Use explicit rem: `spacing="1rem"` not `spacing={2}`
4. **Duplicating types** → Always check `@zerologementvacant/models` first
5. **Legacy useForm hook** → Use react-hook-form + yup instead
6. **Test fixtures** → Must extend `gen*DTO()` from shared models
7. **Not following TDD** → Write tests BEFORE implementation
8. **Jest** → We use Vitest, not Jest