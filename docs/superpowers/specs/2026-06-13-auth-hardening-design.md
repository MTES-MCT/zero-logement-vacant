# Auth Hardening — Design Spec

**Date:** 2026-06-13
**Status:** Approved — ready for implementation planning
**Supersedes:** `docs/explorations/2026-04-10-better-auth-migration.md`

---

## Context

The current auth stack has four audit-critical issues:

| #   | Issue                                                                                              | Severity |
| --- | -------------------------------------------------------------------------------------------------- | -------- |
| 1   | JWT stored in **localStorage** — readable by any JS on the page                                    | Critical |
| 2   | Token accepted from **query string** (`x-access-token` URL param) — logged by proxies and browsers | High     |
| 3   | **No token revocation** — 7-day tokens cannot be invalidated after issuance                        | High     |
| 4   | `changeEstablishment` uses **GET** for a state mutation                                            | High     |
| 5   | Email OTP 2FA is **phishable** — email account compromise breaks the second factor                 | Medium   |
| 6   | Session docs claim `[x] CSRF (SameSite cookies)` — there are no cookies                            | Low      |
| 7   | `AUTH_EXPIRES_IN` defaults to 12 hours; staging redeploys rotate the secret → forced logouts       | UX       |

---

## Decisions

### Token format: opaque (no JWT)

JWT's value proposition is stateless verification — no DB hit per request. ZLV already solves this via the memoized `userCheck()` middleware (5-min TTL). JWT adds complexity (algorithm selection, key rotation) and a revocation gap (up to the cache TTL). An opaque random session token with a DB lookup is simpler, immediately revocable, and easier to audit.

### Session model: fully stateful

Session record lives in PostgreSQL. better-auth manages the `session` table. `userCheck()` memoization handles request-level performance, unchanged from today. "Can you revoke a session?" → yes, immediately: delete the row.

### Storage: HttpOnly cookie

Replaces localStorage + `x-access-token` header entirely. Cookie flags: `HttpOnly; Secure; SameSite=Strict; Path=/`. SameSite=Strict makes CSRF attacks structurally impossible for same-origin requests.

### Session library: better-auth

Replaces the custom sign-in, password reset, bcrypt, and session middleware. ZLV-specific business logic hooks into better-auth lifecycle callbacks rather than living in a monolithic controller.

### 2FA: disabled

better-auth's two-factor plugin is not enabled. The existing custom email OTP flow for admin users (`verifyTwoFactor` endpoint) is removed as part of the migration. 2FA may be revisited as a separate initiative after the session layer is stable.

### External clients: API key plugin, deferred

better-auth's `apiKey` plugin is the right primitive for external consumers (government agencies, internal tooling). It plugs into the same auth middleware chain without changing authorization logic. Deferred until there is a concrete consumer. The session architecture does not need to change when it is added — the middleware becomes a first-wins chain: cookie session → Bearer API key → 401.

### Authorization: RBAC unchanged, role sourced from session

3 roles (ADMIN, USUAL, VISITOR) remain. Role is stored in session `additionalFields`, not in a token payload. `hasRole()` middleware reads `req.user.role` — interface unchanged. Role changes trigger `revokeSession()` server-side, effective immediately.

### Cutover: PostHog feature flag, one-time logout

A PostHog feature flag `auth-v2` guards the migration. When the flag is off, legacy endpoints (`POST /api/authenticate`) work as today. When the flag is on, legacy endpoints return 401 and the new better-auth paths are active.

**Frontend:** `useFeatureFlagEnabled('auth-v2')` from the existing `posthog-js/react` integration. The `AvailableFeatureFlag` union type in `FeatureFlagLayout.tsx` is extended with `'auth-v2'`. Falls back to `config.featureFlags` env var array if PostHog is unavailable (existing pattern).

**Backend:** `posthogService.isFeatureEnabled('auth-v2', 'system')` checked once at request time on the legacy `/api/authenticate` endpoint. Uses the static `'system'` distinct ID — the flag is environment-wide, not per-user.

PostHog's percentage rollout is not used here: auth is binary (either the new session layer is active or it isn't). The flag enables a controlled environment-by-environment cutover (staging first, then production) with instant rollback if needed.

Users currently logged in are logged out once when the flag flips. Both frontend and backend flags are toggled in PostHog simultaneously.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                           │
│  authClient.signIn.email()  →  sets HttpOnly cookie      │
│  authClient.useSession()    →  session state (no Redux)  │
│  RTK Query: credentials: 'include'  (no custom headers)  │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS — SameSite=Strict cookie
┌───────────────────────────▼──────────────────────────────┐
│                      Express API                         │
│                                                          │
│  /api/auth/*     ← better-auth handler (Express adapter) │
│  /api/*          ← existing routes unchanged             │
│                     protected by sessionCheck middleware  │
│                     (replaces jwtCheck + userCheck)       │
│                                                          │
│  Custom endpoints (stay):                                │
│  POST /api/authenticate/verify-2fa   (admin TOTP)        │
│  POST /api/account/establishments/:id  (est. switch)     │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                      PostgreSQL                          │
│  users            (existing, remapped to better-auth)    │
│  session          better-auth managed                    │
│  account          better-auth managed                    │
│  verification     better-auth managed                    │
│  + all existing tables unchanged                         │
└──────────────────────────────────────────────────────────┘
```

---

## What better-auth replaces

| Current                                       | better-auth equivalent               |
| --------------------------------------------- | ------------------------------------ |
| `authController.signIn()`                     | `emailAndPassword` plugin            |
| `authController.resetPassword()`              | `sendResetPassword` callback         |
| `resetLinkRepository`                         | `verification` table (managed)       |
| bcrypt password hashing                       | handled internally                   |
| `jwtCheck()` + JWT validation                 | `auth.api.getSession()`              |
| `authenticationReducer` + localStorage        | `authClient.useSession()`            |
| `auth.service.ts` (authHeader, login, logout) | `authClient.*`                       |
| `useFetchInterceptor.ts`                      | RTK Query `baseQuery` error handling |

## What stays custom

| Concern                               | Why it stays custom                                                      |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Admin TOTP 2FA                        | Verification logic ties into user suspension + lockout                   |
| Signup invite flow                    | Cerema API validation before account creation; no better-auth equivalent |
| `changeEstablishment`                 | Updates session `additionalFields`; ZLV-specific                         |
| `refreshAuthorizedEstablishments`     | Called from better-auth `onSignIn` hook                                  |
| User suspension / perimeter filtering | Domain logic, not auth infrastructure                                    |

---

## better-auth configuration

```typescript
export const auth = betterAuth({
  database: knexAdapter(db), // reuse existing Knex instance
  session: {
    // Fully stateful — no JWT cache
    expiresIn: 30 * 24 * 60 * 60, // 30-day absolute max
    updateAge: 8 * 60 * 60, // extend session if active within 8h window
    // 8h idle timeout: if updatedAt > 8h ago, session is expired
    additionalFields: {
      activeEstablishmentId: { type: 'string', required: false },
      role: { type: 'string', required: false }
    }
  },
  user: {
    // Expand-and-contract: better-auth writes to a new 'auth_users' table.
    // The existing 'users' table is untouched during the migration window.
    // Once all ZLV queries are migrated to read from 'auth_users',
    // 'users' is deprecated and removed in a later sprint.
    modelName: 'auth_users',
    additionalFields: {
      // ZLV-specific columns that have no better-auth equivalent.
      // better-auth owns: id, email, emailVerified, name, createdAt, updatedAt, image.
      // Everything else lives here:
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      role: { type: 'string', required: true },
      // establishmentId intentionally absent — see "establishmentId removal" below
      phone: { type: 'string', required: false },
      position: { type: 'string', required: false },
      timePerWeek: { type: 'string', required: false },
      kind: { type: 'string', required: false },
      activatedAt: { type: 'date', required: false },
      lastAuthenticatedAt: { type: 'date', required: false },
      suspendedAt: { type: 'date', required: false },
      suspendedCause: { type: 'string', required: false },
      deletedAt: { type: 'date', required: false }
    }
  },
  emailAndPassword: {
    enabled: true
    // Return identical errors for 'user not found' and 'wrong password'
    // to prevent account enumeration
  },
  emailVerification: {
    // ZLV does have email verification: the invite/signup-link flow sets activatedAt,
    // which maps to better-auth's emailVerified field.
    // Keep enabled; the sendVerificationEmail callback routes through ZLV's mailService.
    enabled: true,
    sendVerificationEmail: async ({ user, url }) => {
      // delegate to mailService — preserves existing email infrastructure
    }
  },
  // No plugins: twoFactor disabled (see Decisions)
  hooks: {
    after: [
      {
        matcher: (ctx) => ctx.path === '/sign-in/email',
        handler: async (ctx) => {
          // refreshAuthorizedEstablishments(user)
          // fetchUserKind(user.email)
          // update session.activeEstablishmentId
        }
      }
    ]
  },
  trustedOrigins: [config.app.frontendUrl],
  advanced: {
    // Override email sender — use ZLV mailService
    // for password reset emails
  }
});
```

---

## Session cookie

| Property    | Value                                                     |
| ----------- | --------------------------------------------------------- |
| Name        | `better-auth.session_token`                               |
| Flags       | `HttpOnly; Secure; SameSite=Strict`                       |
| Path        | `/`                                                       |
| Max-Age     | 30 days (absolute)                                        |
| Idle expiry | 8h — enforced server-side by checking `session.updatedAt` |

---

## Auth middleware (replaces jwtCheck + userCheck)

```typescript
export function sessionCheck(options?: CheckOptions) {
  return async (req, res, next) => {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      if (options?.required ?? true) throw new AuthenticationMissingError();
      return next();
    }

    // Reuse existing memoized DB lookups — unchanged
    const [user, establishment, userPerimeter] = await Promise.all([
      getUser(session.user.id),
      getEstablishment(session.session.activeEstablishmentId),
      getUserPerimeter(session.user.id)
    ]);

    req.user          = user;
    req.establishment = establishment;
    req.userPerimeter = userPerimeter;
    req.effectiveGeoCodes = /* existing perimeter logic */;
    next();
  };
}
```

`hasRole()` is unchanged. `jwtCheck()` is deleted.

---

## CORS update

```typescript
app.use(
  cors({
    origin: config.app.frontendUrl,
    credentials: true, // required for cookie auth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'] // x-access-token removed
  })
);
```

---

## Frontend changes

### Removed

- `auth.service.ts` → `login()`, `verifyTwoFactor()`, `logout()`, `authHeader()`, `withAuthHeader()`
- `authenticationReducer.tsx`, `auth-thunks.ts`, `authenticationSlice`
- `localStorage.getItem('authUser')` — all usages
- `prepareHeaders` token injection in RTK Query base query
- `useFetchInterceptor.ts`
- `useUser()` hook

### Added: AuthContext + AuthProvider

Auth state moves from Redux into a React Context. Auth is not server state — it is not a cacheable resource — so RTK Query is the wrong tool for it. A Context + Provider is the idiomatic pattern.

```typescript
// frontend/src/contexts/AuthContext.tsx
interface AuthContextValue {
  // Server-side state — not derivable on the client
  user: User | null;
  establishment: Establishment | null;
  authorizedEstablishments: Establishment[];
  effectiveGeoCodes: string[] | undefined;
  isLoading: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changeEstablishment: (establishmentId: string) => Promise<void>;
}
```

**Removed from the old `useUser()` shape — and why:**

| Removed                                             | Replacement                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `isAuthenticated`                                   | `user !== null` — trivial derivation, not context's job                                                       |
| `isAdmin / isUsual / isVisitor`                     | `user?.role === UserRole.ADMIN` — one expression, scales with role changes, no parallel state to keep in sync |
| `canChangeEstablishment`                            | UI rule — belongs in the component or a local selector, not in the global context                             |
| `displayName()`                                     | Pure function of `user` — utility function, not state                                                         |
| `isError / isLoading / isUninitialized / isSuccess` | RTK Query lifecycle flags; not applicable to a Context — `isLoading` covers the session hydration case        |

`effectiveGeoCodes` stays because it is server-computed from the user's Portail DF perimeter and the establishment's geo codes — it cannot be re-derived on the client.

```typescript
// frontend/src/contexts/AuthProvider.tsx
// - calls authClient.signIn.email() / signOut()
// - on signOut: also dispatches zlvApi.util.resetApiState() to clear RTK Query cache
// - hydrates from authClient.useSession() on mount
// - wraps the app at the router root
```

### Added: useAuth hook

```typescript
// frontend/src/hooks/useAuth.ts
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

All `useUser()` call sites migrate to `useAuth()`. Derived booleans (`isAdmin`, etc.) move inline at each call site.

### RTK Query

- Add `credentials: 'include'` to the base query — no other change.
- Remove `prepareHeaders`.
- 401 from the API → `baseQuery` catches it, calls `signOut()` from context, redirects to `/login`.

### Auth state shape

`AuthUser` type is removed. The frontend never sees or stores the session token. User and establishment data come from `AuthContext`, populated by `authClient.useSession()` on the server response.

---

## 2FA

The existing `POST /api/authenticate/verify-2fa` endpoint (email OTP, admin-only) is removed as part of this migration. better-auth's two-factor plugin is not enabled.

2FA is explicitly out of scope — it will be revisited as a separate initiative after the session layer is stable. The security audit finding for "email OTP is phishable" is acknowledged but deferred.

---

## establishmentId removal

`users.establishment_id` has always been semantically wrong: it stores which establishment a user is _currently active in_, but that is per-session state, not per-user state. Two concurrent sessions from the same user on different devices could legitimately target different establishments, but the column can only hold one value.

`users_establishments` is the authoritative source for which establishments a user is _authorised_ to access. The active one per session lives in `session.additionalFields.activeEstablishmentId`.

### Sign-in behaviour

At sign-in the `onSignIn` hook resolves `activeEstablishmentId` automatically — the user is never prompted to choose:

1. Take the first entry in `users_establishments` where `hasCommitment = true` (ordered by `created_at asc`).
2. Fallback during the migration window: `users.establishment_id`, for users whose `users_establishments` row has not yet been populated.

The user can switch to a different authorised establishment at any time via `POST /api/account/establishments/:id`. This endpoint updates only `session.activeEstablishmentId` — no write to the user record.

### Data model impact

- `auth_users` has no `establishmentId` column — not even as an `additionalField`.
- `users.establishment_id` is dropped when `users` is deprecated (Sprint N+2).
- `UserDTO.establishmentId` in `packages/models/` is deprecated in the same sprint — consumers read the active establishment from `AuthContext`.

---

## Database migration

better-auth requires four new tables. They are additive — no existing table is modified during the migration window.

```sql
-- better-auth managed (exact schema generated by better-auth CLI / migrate command):
--   auth_users     — replaces users (expand-and-contract)
--   session        — active sessions
--   account        — links users to auth providers (email+password)
--   verification   — password reset tokens, email verification

-- users table: untouched during migration window.
-- Dropped in a later sprint once auth_users is the sole source of truth.
```

A dedicated spike is required before implementation to verify the `auth_users` additional fields match all ZLV column types exactly — this is the highest-risk step of the migration.

---

## Feature flag cutover

Flag name: `auth-v2` — managed in PostHog dashboard. Fallback: `FEATURE_FLAGS=auth-v2` env var (existing pattern from `config.featureFlags`).

| Step                                                | Who                | When                |
| --------------------------------------------------- | ------------------ | ------------------- |
| Add better-auth DB tables (migration)               | Backend            | Before feature flag |
| Implement new auth (flag off by default)            | Backend + Frontend | Sprint N            |
| Enable `auth-v2` flag in PostHog for **staging**    | Team               | Sprint N            |
| Validate full flow on staging                       | Team               | Sprint N            |
| Enable `auth-v2` flag in PostHog for **production** | Deploy             | Sprint N+1          |
| Remove legacy `authController.signIn` + `jwtCheck`  | Backend            | Sprint N+2          |
| Remove legacy Redux auth slice + `auth.service.ts`  | Frontend           | Sprint N+2          |
| Remove `auth-v2` flag from PostHog + codebase       | Team               | Sprint N+2          |

**Middleware strategy during the transition window:** after the migration deploy, both `sessionCheck` (new) and `jwtCheck` (legacy) are active. `sessionCheck` runs first; if no session cookie is found, `jwtCheck` handles the legacy `x-access-token` header. This means:

- Users on new auth (cookie session) continue to work
- Users still carrying a legacy JWT continue to work until their token expires
- Rollback = flip PostHog flag off → frontend reverts to legacy login; both session types remain valid
- Sprint N+2 cleanup removes `jwtCheck` entirely, at which point legacy tokens stop being accepted

`AvailableFeatureFlag` in `frontend/src/layouts/FeatureFlagLayout.tsx` must include `'auth-v2'` before the flag is created in PostHog.

---

## Security audit checklist (post-migration)

- [x] JWT removed from localStorage
- [x] Token never appears in URL or custom header
- [x] Token revocation: immediate (delete session row)
- [x] HttpOnly + Secure + SameSite=Strict cookie
- [x] Idle timeout: 8 hours
- [x] Absolute session max: 30 days
- [x] Account enumeration: identical errors for unknown email / wrong password
- [ ] TOTP 2FA for admin users — deferred, separate initiative
- [x] `changeEstablishment` is POST (state mutation)
- [x] CORS `credentials: true` with explicit origin whitelist
- [x] Rate limiting on auth endpoints (calibrated to ≥ current limits)

---

## Out of scope

- External API clients (API key plugin) — deferred, additive when needed
- OAuth2 / OIDC provider — deferred
- Extending 2FA to non-admin users
- Per-establishment role model
