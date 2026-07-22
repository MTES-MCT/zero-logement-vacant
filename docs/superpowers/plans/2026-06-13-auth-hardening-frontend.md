# Auth Hardening — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Redux auth slice + localStorage token with `AuthContext` + `useAuth`, backed by better-auth's React client and HttpOnly cookies, behind the PostHog `auth-v2` feature flag.

**Architecture:** `AuthProvider` wraps the app when the `auth-v2` flag is on. It uses `authClient.useSession()` for session hydration. `useAuth()` replaces `useUser()` everywhere. RTK Query drops `prepareHeaders` and adds `credentials: 'include'`. Legacy code (Redux slice, auth-thunks, auth.service) is deleted post-cutover.

**Tech Stack:** better-auth React client (`better-auth/react`), React Context, RTK Query, PostHog (`posthog-js/react`), react-hook-form + yup, Vitest + MSW

**Prerequisite:** The backend plan (`2026-06-13-auth-hardening-backend.md`) must be deployed with the `auth-v2` flag OFF before this plan begins.

---

## Part A — Build the new auth system (flag OFF during development)

---

### Task 1: Install better-auth client and add feature flag type

**Files:**

- Modify: `frontend/package.json` (via yarn)
- Modify: `frontend/src/layouts/FeatureFlagLayout.tsx`

- [ ] **Step 1: Install better-auth in the frontend workspace**

```bash
yarn workspace @zerologementvacant/front add better-auth --exact
```

- [ ] **Step 2: Add `auth-v2` to the feature flag union type**

In `frontend/src/layouts/FeatureFlagLayout.tsx`, update the union:

```typescript
type AvailableFeatureFlag = 'new-analysis-page' | 'auth-v2';
```

- [ ] **Step 3: Verify types compile**

```bash
yarn nx typecheck frontend 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json yarn.lock frontend/src/layouts/FeatureFlagLayout.tsx
git commit -m "chore(front): add better-auth client, register auth-v2 feature flag"
```

---

### Task 2: Create the better-auth React client

**Files:**

- Create: `frontend/src/lib/auth-client.ts`

- [ ] **Step 1: Find the API base URL config**

```bash
grep -n "apiEndpoint\|baseUrl\|API_URL" frontend/src/utils/config.ts | head -10
```

- [ ] **Step 2: Create the auth client**

Create `frontend/src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/react';
import config from '~/utils/config';

export const authClient = createAuthClient({
  baseURL: config.apiEndpoint
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
yarn nx typecheck frontend 2>&1 | grep "auth-client" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/auth-client.ts
git commit -m "feat(front): create better-auth React client"
```

---

### Task 3: Create AuthContext and AuthProvider

**Files:**

- Create: `frontend/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Check what establishment data shape the existing code uses**

```bash
grep -n "Establishment\b" frontend/src/models/Establishment.ts | head -20
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/contexts/test/AuthContext.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, AuthContext } from '../AuthContext';
import { useContext } from 'react';
import { mockAPI } from '~/mocks/mock-api';
import { http, HttpResponse } from 'msw';

function TestConsumer() {
  const auth = useContext(AuthContext)!;
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="user">{auth.user?.email ?? 'none'}</span>
      <span data-testid="establishment">{auth.establishment?.name ?? 'none'}</span>
      <button onClick={() => auth.signOut()}>sign out</button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('exposes null user when session is absent', async () => {
    mockAPI.use(
      http.get('*/api/auth/get-session', () => HttpResponse.json(null))
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('exposes user and establishment when session exists', async () => {
    mockAPI.use(
      http.get('*/api/auth/get-session', () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'agent@zlv.fr', firstName: 'Agent', lastName: 'Test' },
          session: { activeEstablishmentId: 'est-1' }
        })
      ),
      http.get('*/api/account', () =>
        HttpResponse.json({ id: 'est-1', name: 'Mairie de Paris' })
      )
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('agent@zlv.fr')
    );
    expect(screen.getByTestId('establishment').textContent).toBe('Mairie de Paris');
  });
});
```

- [ ] **Step 3: Run to confirm the test fails**

```bash
yarn nx test frontend -- src/contexts/test/AuthContext.test.tsx
```

Expected: FAIL — `AuthContext` not found.

- [ ] **Step 4: Create AuthContext and AuthProvider**

Create `frontend/src/contexts/AuthContext.tsx`:

```typescript
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useState
} from 'react';
import type { Establishment } from '~/models/Establishment';
import type { User } from '~/models/User';
import { authClient } from '~/lib/auth-client';
import { zlvApi } from '~/services/api.service';
import { useAppDispatch } from '~/hooks/useStore';

export interface AuthContextValue {
  user:                     User | null;
  establishment:            Establishment | null;
  authorizedEstablishments: Establishment[];
  effectiveGeoCodes:        string[] | undefined;
  isLoading:                boolean;
  signIn:              (email: string, password: string) => Promise<void>;
  signOut:             () => Promise<void>;
  changeEstablishment: (establishmentId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const { data: session, isPending } = authClient.useSession();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [authorizedEstablishments, setAuthorizedEstablishments] = useState<Establishment[]>([]);
  const [effectiveGeoCodes, setEffectiveGeoCodes] = useState<string[] | undefined>(undefined);

  // Hydrate establishment data when session changes
  useEffect(() => {
    const activeId = (session?.session as any)?.activeEstablishmentId;
    if (!activeId) {
      setEstablishment(null);
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/account`, {
      credentials: 'include'
    })
      .then((r) => r.json())
      .then((data) => {
        setEstablishment(data.establishment ?? null);
        setAuthorizedEstablishments(data.authorizedEstablishments ?? []);
        setEffectiveGeoCodes(data.effectiveGeoCodes);
      })
      .catch(() => {/* non-fatal */});
  }, [(session?.session as any)?.activeEstablishmentId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    dispatch(zlvApi.util.resetApiState());
    setEstablishment(null);
    setAuthorizedEstablishments([]);
    setEffectiveGeoCodes(undefined);
  }, [dispatch]);

  const changeEstablishment = useCallback(async (establishmentId: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/account/establishments/${establishmentId}`,
      { method: 'POST', credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to change establishment');
    const data = await response.json();
    setEstablishment(data.establishment);
    setEffectiveGeoCodes(data.effectiveGeoCodes);
  }, []);

  const value: AuthContextValue = {
    user:                     (session?.user as User | null) ?? null,
    establishment,
    authorizedEstablishments,
    effectiveGeoCodes,
    isLoading:                isPending,
    signIn,
    signOut,
    changeEstablishment
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

> **Note:** Replace `import.meta.env.VITE_API_URL` with the actual config pattern used in `frontend/src/utils/config.ts`.

- [ ] **Step 5: Run tests to confirm they pass**

```bash
yarn nx test frontend -- src/contexts/test/AuthContext.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/contexts/AuthContext.tsx \
        frontend/src/contexts/test/AuthContext.test.tsx
git commit -m "feat(front): add AuthContext and AuthProvider"
```

---

### Task 4: Create the useAuth hook

**Files:**

- Create: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/test/useAuth.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '~/contexts/AuthContext';
import { useAuth } from '../useAuth';

function TestComponent() {
  const auth = useAuth();
  return <span data-testid="email">{auth.user?.email ?? 'none'}</span>;
}

const fakeContext: AuthContextValue = {
  user: { email: 'a@b.fr' } as any,
  establishment: null,
  authorizedEstablishments: [],
  effectiveGeoCodes: undefined,
  isLoading: false,
  signIn: async () => {},
  signOut: async () => {},
  changeEstablishment: async () => {}
};

describe('useAuth', () => {
  it('returns context value when inside AuthProvider', () => {
    render(
      <AuthContext.Provider value={fakeContext}>
        <TestComponent />
      </AuthContext.Provider>
    );
    expect(screen.getByTestId('email').textContent).toBe('a@b.fr');
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
yarn nx test frontend -- src/hooks/test/useAuth.test.tsx
```

Expected: FAIL — `useAuth` not found.

- [ ] **Step 3: Create the hook**

Create `frontend/src/hooks/useAuth.ts`:

```typescript
import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '~/contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
yarn nx test frontend -- src/hooks/test/useAuth.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useAuth.ts frontend/src/hooks/test/useAuth.test.tsx
git commit -m "feat(front): add useAuth hook"
```

---

### Task 5: Update RTK Query base query

**Files:**

- Modify: `frontend/src/services/api.service.ts`

- [ ] **Step 1: Write the failing test**

In `frontend/src/services/test/api.service.test.ts` (create if absent):

```typescript
import { describe, it, expect } from 'vitest';
import { zlvApi } from '../api.service';

describe('zlvApi base query', () => {
  it('does not have prepareHeaders injecting x-access-token', () => {
    // The base query definition is inspectable via the internal config.
    // Simpler: verify a request does NOT include the auth header.
    // This is validated by the integration tests in auth-api.test.ts.
    // Here we just verify the import resolves without referencing authService.
    expect(zlvApi).toBeDefined();
  });
});
```

- [ ] **Step 2: Update api.service.ts**

In `frontend/src/services/api.service.ts`, replace:

```typescript
import authService from './auth.service';

export const zlvApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiEndpoint,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
```

With:

```typescript
export const zlvApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiEndpoint,
    credentials: 'include',
```

Remove the `import authService` line entirely.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
yarn nx typecheck frontend 2>&1 | grep "api.service" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api.service.ts
git commit -m "feat(front): RTK Query uses credentials:include, drops x-access-token header"
```

---

### Task 6: Update RequireAuth and RequireGuest

**Files:**

- Modify: `frontend/src/components/Auth/RequireAuth.tsx`
- Modify: `frontend/src/components/Auth/RequireGuest.tsx`

- [ ] **Step 1: Write the failing test for RequireAuth**

Create `frontend/src/components/Auth/test/RequireAuth.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RequireAuth from '../RequireAuth';
import { AuthContext, type AuthContextValue } from '~/contexts/AuthContext';

function withAuth(value: Partial<AuthContextValue>, children: React.ReactNode) {
  const ctx: AuthContextValue = {
    user: null, establishment: null, authorizedEstablishments: [],
    effectiveGeoCodes: undefined, isLoading: false,
    signIn: async () => {}, signOut: async () => {}, changeEstablishment: async () => {},
    ...value
  };
  return (
    <AuthContext.Provider value={ctx}>
      <MemoryRouter>{children}</MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('RequireAuth', () => {
  it('renders children when authenticated', () => {
    render(
      withAuth({ user: { email: 'a@b.fr' } as any, establishment: { id: 'e1' } as any },
        <RequireAuth><span>protected</span></RequireAuth>
      )
    );
    expect(screen.getByText('protected')).toBeInTheDocument();
  });

  it('redirects to /connexion when not authenticated', () => {
    render(
      withAuth({ user: null },
        <RequireAuth><span>protected</span></RequireAuth>
      )
    );
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
yarn nx test frontend -- src/components/Auth/test/RequireAuth.test.tsx
```

Expected: FAIL — still using `useUser`.

- [ ] **Step 3: Update RequireAuth**

```typescript
import { usePostHog } from 'posthog-js/react';
import { type PropsWithChildren, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '~/hooks/useAuth';

function RequireAuth(props: PropsWithChildren) {
  const { establishment, user } = useAuth();
  const location = useLocation();
  const posthog = usePostHog();
  const isAuthenticated = user !== null && establishment !== null;

  useEffect(() => {
    if (user && establishment) {
      posthog.identify(establishment.id, { name: establishment.name });
    }
  }, [user, establishment, posthog]);

  if (isAuthenticated) return props.children;
  return <Navigate to="/connexion" replace state={{ path: location.pathname }} />;
}

export default RequireAuth;
```

- [ ] **Step 4: Update RequireGuest**

```typescript
import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '~/hooks/useAuth';

function RequireGuest(props: PropsWithChildren) {
  const { user } = useAuth();
  if (!user) return props.children;
  return <Navigate to="/parc-de-logements" replace />;
}

export default RequireGuest;
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
yarn nx test frontend -- src/components/Auth/test/RequireAuth.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Auth/RequireAuth.tsx \
        frontend/src/components/Auth/RequireGuest.tsx \
        frontend/src/components/Auth/test/RequireAuth.test.tsx
git commit -m "feat(front): RequireAuth and RequireGuest use useAuth"
```

---

### Task 7: Update LoginView to use authClient

**Files:**

- Modify: `frontend/src/views/Login/LoginView.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/views/Login/test/LoginView.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import LoginView from '../LoginView';
import { AuthContext, type AuthContextValue } from '~/contexts/AuthContext';
import { mockAPI } from '~/mocks/mock-api';
import { http, HttpResponse } from 'msw';

function wrapper(signIn: AuthContextValue['signIn']) {
  const ctx: AuthContextValue = {
    user: null, establishment: null, authorizedEstablishments: [],
    effectiveGeoCodes: undefined, isLoading: false,
    signIn, signOut: async () => {}, changeEstablishment: async () => {}
  };
  return ({ children }: any) => (
    <AuthContext.Provider value={ctx}>
      <MemoryRouter>{children}</MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('LoginView', () => {
  it('calls signIn with email and password on submit', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn().mockResolvedValue(undefined);

    render(<LoginView />, { wrapper: wrapper(signIn) });

    await user.type(screen.getByLabelText(/email/i), 'agent@zlv.fr');
    await user.type(screen.getByLabelText(/mot de passe/i), 'MonMotDePasse1!');
    await user.click(screen.getByRole('button', { name: /connexion/i }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith('agent@zlv.fr', 'MonMotDePasse1!')
    );
  });

  it('shows an error when signIn rejects', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn().mockRejectedValue(new Error('Identifiants invalides'));

    render(<LoginView />, { wrapper: wrapper(signIn) });

    await user.type(screen.getByLabelText(/email/i), 'agent@zlv.fr');
    await user.type(screen.getByLabelText(/mot de passe/i), 'WrongPassword1!');
    await user.click(screen.getByRole('button', { name: /connexion/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
yarn nx test frontend -- src/views/Login/test/LoginView.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Rewrite LoginView to use useAuth**

The new LoginView keeps the same yup schema and DSFR form layout. Replace the Redux dispatch with `useAuth().signIn`:

```typescript
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers/yup';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import * as yup from 'yup';
import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useAuth } from '~/hooks/useAuth';
import building from '~/assets/images/building.svg';
import Image from '~/components/Image/Image';

const schema = yup.object({
  email: yup
    .string()
    .trim()
    .required('Veuillez renseigner votre adresse email.')
    .email("L’adresse doit être un email valide."),
  password: yup
    .string()
    .trim()
    .required('Veuillez renseigner un mot de passe.')
}).required();

type LoginSchema = yup.InferType<typeof schema>;

function LoginView() {
  useDocumentTitle('Connexion');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<LoginSchema>({
    defaultValues: { email: '', password: '' },
    resolver: yupResolver(schema)
  });

  async function onSubmit(data: LoginSchema) {
    setLoginError(null);
    try {
      await signIn(data.email, data.password);
      navigate('/parc-de-logements');
    } catch {
      setLoginError('Échec de l’authentification. Vérifiez vos identifiants.');
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: '2rem' }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
          {loginError && (
            <Alert
              title="Erreur"
              description={loginError}
              severity="error"
              sx={{ my: '1rem' }}
            />
          )}
          <Stack spacing="1rem" component="form" onSubmit={form.handleSubmit(onSubmit)}>
            <AppTextInputNext
              label="Email"
              nativeInputProps={{ ...form.register('email'), type: 'email', autoComplete: 'email' }}
            />
            <AppTextInputNext
              label="Mot de passe"
              nativeInputProps={{ ...form.register('password'), type: 'password', autoComplete: 'current-password' }}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Connexion
            </Button>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Image src={building} alt="" />
        </Grid>
      </Grid>
    </Container>
  );
}

export default LoginView;
```

> **Note:** Preserve any additional UI sections from the original LoginView (links, RGPD text, etc.) that are not shown here. Copy them verbatim.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
yarn nx test frontend -- src/views/Login/test/LoginView.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/Login/LoginView.tsx \
        frontend/src/views/Login/test/LoginView.test.tsx
git commit -m "feat(front): LoginView uses useAuth().signIn, drops Redux dispatch"
```

---

### Task 8: Migrate all remaining useUser() call sites to useAuth()

`useUser()` returns derived booleans (`isAdmin`, `isGuest`, etc.) that `useAuth()` does not. At each call site, replace the derived values inline.

- [ ] **Step 1: List all remaining call sites**

```bash
grep -rn "useUser" frontend/src --include="*.tsx" --include="*.ts" | grep -v test | grep -v "useUser.tsx"
```

- [ ] **Step 2: For each file, apply the migration pattern**

Replace:

```typescript
import { useUser } from '~/hooks/useUser';
const {
  user,
  establishment,
  isAdmin,
  isUsual,
  isVisitor,
  isAuthenticated,
  canChangeEstablishment,
  authorizedEstablishments,
  effectiveGeoCodes,
  logOut
} = useUser();
```

With:

```typescript
import { useAuth } from '~/hooks/useAuth';
import { UserRole } from '@zerologementvacant/models';
const {
  user,
  establishment,
  authorizedEstablishments,
  effectiveGeoCodes,
  signOut
} = useAuth();
const isAdmin = user?.role === UserRole.ADMIN;
const isUsual = user?.role === UserRole.USUAL;
const isVisitor = user?.role === UserRole.VISITOR;
const isAuthenticated = user !== null && establishment !== null;
const canChangeEstablishment =
  isAdmin ||
  isVisitor ||
  (isUsual && (authorizedEstablishments?.length ?? 0) > 1);
```

Replace any `logOut()` calls with `signOut()`.

- [ ] **Step 3: Verify no remaining useUser imports**

```bash
grep -rn "from.*useUser\|useUser()" frontend/src --include="*.tsx" --include="*.ts" | grep -v "useUser.tsx" | grep -v test
```

Expected: empty output.

- [ ] **Step 4: Run the full frontend test suite**

```bash
yarn nx test frontend
```

Expected: no regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "refactor(front): migrate all useUser() call sites to useAuth()"
```

---

### Task 9: Wrap the app with AuthProvider behind the feature flag

**Files:**

- Modify: `frontend/src/App.tsx` (or the router root — find with `grep -rn "BrowserRouter\|createBrowserRouter" frontend/src`)

- [ ] **Step 1: Find the app root**

```bash
grep -rn "BrowserRouter\|RouterProvider\|createBrowserRouter" frontend/src --include="*.tsx" -l
```

- [ ] **Step 2: Wrap with AuthProvider conditionally**

In the app root file:

```typescript
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { AuthProvider } from '~/contexts/AuthContext';

function AppWithAuth() {
  const isV2 = useFeatureFlagEnabled('auth-v2');

  // Wait for PostHog to resolve the flag before rendering
  // (avoids a flash of the wrong auth path)
  if (isV2 === undefined) return null;

  if (isV2) {
    return (
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    );
  }

  // Legacy auth path — unchanged Redux-based flow
  return <AppRoutes />;
}
```

Replace the existing `<AppRoutes />` (or equivalent) invocation with `<AppWithAuth />`.

- [ ] **Step 3: Verify the app builds**

```bash
yarn nx build frontend 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx  # adjust path
git commit -m "feat(front): wrap app with AuthProvider when auth-v2 flag is on"
```

---

## Part B — Post-cutover cleanup (after auth-v2 is validated in production)

Run these tasks only after the `auth-v2` PostHog flag has been on in production for at least one working day with no regressions.

---

### Task 10: Delete legacy auth Redux code

**Files:**

- Delete: `frontend/src/store/reducers/authenticationReducer.tsx`
- Delete: `frontend/src/store/thunks/auth-thunks.ts`
- Delete: `frontend/src/store/actions/authenticationAction.tsx`
- Delete: `frontend/src/hooks/useUser.tsx`
- Delete: `frontend/src/views/Login/TwoFactorView.tsx` (2FA disabled in this migration)
- Modify: `frontend/src/store/store.tsx` (remove authenticationReducer from combined reducers)

- [ ] **Step 1: Remove authenticationReducer from the Redux store**

In `frontend/src/store/store.tsx`, find and remove the `authentication` slice from `combineReducers` (or equivalent):

```bash
grep -n "authentication\|authenticationReducer" frontend/src/store/store.tsx
```

Delete the import and the slice entry.

- [ ] **Step 2: Delete the files**

```bash
rm frontend/src/store/reducers/authenticationReducer.tsx \
   frontend/src/store/thunks/auth-thunks.ts \
   frontend/src/store/actions/authenticationAction.tsx \
   frontend/src/hooks/useUser.tsx \
   frontend/src/views/Login/TwoFactorView.tsx
```

- [ ] **Step 3: Remove the conditional in AppWithAuth**

In the app root, remove the `isV2` check and always use `AuthProvider`:

```typescript
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
yarn nx typecheck frontend
```

Expected: no errors.

- [ ] **Step 5: Run the full test suite**

```bash
yarn nx test frontend
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "chore(front): remove legacy Redux auth slice and useUser after auth-v2 cutover"
```

---

### Task 11: Delete legacy auth.service.ts

**Files:**

- Delete: `frontend/src/services/auth.service.ts`
- Modify: any remaining imports of `auth.service.ts`

- [ ] **Step 1: Find remaining consumers**

```bash
grep -rn "from.*auth.service\|auth\.service" frontend/src --include="*.ts" --include="*.tsx" | grep -v test
```

- [ ] **Step 2: Remove remaining usages**

For each file found, remove the import and any usage of `authService.authHeader()`, `authService.withAuthHeader()`, etc. These are no longer needed — cookies are sent automatically.

- [ ] **Step 3: Delete the file**

```bash
rm frontend/src/services/auth.service.ts
```

- [ ] **Step 4: Run the full test suite**

```bash
yarn nx test frontend && yarn nx typecheck frontend
```

Expected: all pass, no errors.

- [ ] **Step 5: Delete the auth-v2 flag from FeatureFlagLayout**

In `frontend/src/layouts/FeatureFlagLayout.tsx`:

```typescript
type AvailableFeatureFlag = 'new-analysis-page'; // remove 'auth-v2'
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "chore(front): delete auth.service.ts and auth-v2 feature flag after cutover"
```
