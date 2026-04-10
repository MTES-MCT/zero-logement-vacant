# Exploration: Migrating to better-auth

**Date:** 2026-04-10
**Status:** Exploration — no decision taken
**Topic:** Replacing the custom auth stack with better-auth, using stateless JWT in HttpOnly cookies

---

## Context

The current auth stack is entirely custom:
- JWT (HS256) signed with an app secret, stored in **localStorage**
- Sent via a custom `x-access-token` header on every request
- Manual `jwtCheck()` + `userCheck()` + `hasRole()` middleware chain
- Custom password reset links, signup invite links, bcrypt handling, 2FA (email OTP, admin-only, currently disabled)
- Frontend: Redux slice + localStorage hydration + `fetch-intercept` for 401 handling

The goal of this exploration was to evaluate whether better-auth could replace the standard parts of this stack while keeping ZLV-specific business logic custom.

---

## JWT is not the problem — localStorage is

JWT itself is a legitimate, widely-used auth mechanism with real benefits:
- Stateless verification — no DB hit per request
- Self-contained claims — `establishmentId` embedded in token is elegant
- Genuine horizontal scalability

The actual problem with the current implementation is **storing the JWT in localStorage**, which is readable by any JavaScript on the page. An XSS attack exfiltrates the token and we cannot revoke it.

The fix is a **storage decision, not an auth mechanism decision**: move the JWT to an `HttpOnly` cookie.

---

## Target architecture: stateless JWT in HttpOnly cookie

better-auth supports this via `cookieCache` with JWT strategy:

```typescript
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
      strategy: "jwt"
    }
  }
})
```

This gives:
- JWT stored in an **HttpOnly cookie** — XSS-safe
- **No DB hit** per request (stateless validation from the cookie, within the cache TTL)
- A session record still exists in the DB — **revocation is possible** (delete the record; the JWT cache expires within TTL)
- All better-auth plugins work on top of this

It is a hybrid: stateless for the hot path, with revocation capability as a fallback. Strictly better than pure stateless JWT.

---

## What better-auth replaces

| Current | better-auth equivalent |
|---|---|
| `accountController.signIn()` | `emailAndPassword` plugin |
| `accountController.resetPassword()` | `sendResetPassword` callback |
| `resetLinkRepository` | handled internally |
| bcrypt password hashing | handled internally |
| `jwtCheck()` + `userCheck()` | `auth.api.getSession()` |
| `authenticationReducer` + `auth-thunks.ts` | `authClient.useSession()` hook |
| `auth.service.ts` (authHeader, localStorage) | `authClient.signIn.email()` etc. |
| `useFetchInterceptor.ts` | RTK Query `baseQuery` error handling |
| `RequireAuth` / `RequireGuest` | same logic, read from `authClient.useSession()` |

---

## What stays custom

### 1. Signup invite flow
`POST /api/signup-links` involves prospect validation and a Cerema API call before account creation. There is no better-auth equivalent. This stays as a custom endpoint that calls `auth.api.createUser()` internally after validating the prospect.

### 2. Establishment switching
The current JWT embeds `{ userId, establishmentId }`. better-auth sessions contain `{ userId }` only.

Solution: store `activeEstablishmentId` in session `additionalFields`. Establishment switching becomes a custom endpoint that updates the session record and invalidates the cookie cache.

```typescript
export const auth = betterAuth({
  session: {
    additionalFields: {
      activeEstablishmentId: { type: "string", required: false }
    }
  }
})
```

### 3. Admin 2FA
Currently disabled. better-auth has TOTP (authenticator app) built-in. If re-enabled, this is a UX change from email OTP to TOTP. No blocker.

### 4. Cerema API integration (`userKind` fetching)
Called on login to determine user kind. Moves to a better-auth `onSignIn` hook.

### 5. `lastAuthenticatedAt` tracking
Stored as `additionalFields` on the user model.

---

## Frontend changes

- Drop `auth.service.ts`, `authenticationReducer.tsx`, `auth-thunks.ts`
- Drop `useFetchInterceptor.ts`
- Drop localStorage `'authUser'` key entirely
- RTK Query: remove `prepareHeaders` auth header injection, add `credentials: 'include'`
- `useUser()` becomes a thin wrapper around `authClient.useSession()`
- Login/2FA views call `authClient.signIn.email()` directly

---

## Database migration

better-auth requires these tables alongside the existing schema:

| Table | Purpose |
|---|---|
| `session` | session records (even with cookie cache) |
| `account` | links users to auth providers |
| `verification` | reset tokens, email verification |

The existing `users` table can be reused via field remapping:

```typescript
export const auth = betterAuth({
  user: {
    modelName: "users",
    fields: { /* remap better-auth field names to existing columns */ },
    additionalFields: { role, activatedAt, lastAuthenticatedAt, /* etc. */ }
  }
})
```

This needs a close audit of the existing `users` table columns before committing to an approach.

---

## External clients and OAuth2

HttpOnly cookies are a browser primitive. Non-browser clients (mobile apps, CLI tools, server-to-server) cannot use them cleanly.

The clean architecture is two separate auth paths:

```
Browser SPA      → HttpOnly cookie JWT   (better-auth session layer)
External clients → Bearer token          (API keys or OAuth2)
```

better-auth supports acting as an **OAuth2 / OIDC provider** via the `oidcProvider` plugin, exposing standard endpoints (`/oauth2/authorize`, `/oauth2/token`, `/.well-known/openid-configuration`).

For internal tooling or a first-party mobile app, the `apiKey` plugin is simpler and sufficient. Full OAuth2 is the right call if the API is opened to third-party developers.

The `activeEstablishmentId` context would need to be surfaced as a custom claim in OAuth2 access tokens if external clients need establishment-scoped access.

---

## Trade-offs summary

| Concern | Current | After migration |
|---|---|---|
| XSS token theft | Vulnerable (localStorage) | Protected (HttpOnly cookie) |
| Session revocation | Impossible | Possible (within cache TTL) |
| DB hit per request | No | No (cookie cache) |
| Establishment in token | Native (JWT payload) | `additionalFields` on session |
| Auth flows maintenance | Fully custom | better-auth handles standard flows |
| Signup invite flow | Custom | Stays custom |
| External API clients | Unsupported | API keys or OAuth2 via plugin |

---

## Estimated migration scope

Roughly 2–3 weeks of focused work:

- **Server:** wire up better-auth + Express, migrate middleware, keep custom endpoints for signup/establishment
- **Frontend:** replace Redux auth slice + service layer with `authClient`, update RTK Query
- **DB:** add `session`, `account`, `verification` tables; audit and remap `users` table

The main architectural risk is the `users` table remapping — worth a dedicated spike before starting the migration proper.
