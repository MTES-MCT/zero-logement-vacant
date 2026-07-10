# front-e2e-pw — Playwright pilot

End-to-end tests for the Better Auth surface (`better-auth` + customSession +
AuthContext-driven frontend) using Playwright. Runs alongside the existing
Cypress suite (`apps/front-e2e/`) as a pilot — if it proves out, we'll plan
a wider migration from Cypress to Playwright separately.

## Why Playwright for this pilot

- **Trace viewer**: every failure ships a complete DOM + network + action
  timeline (`trace: 'on-first-retry'`). Reproduces flaky failures from CI
  without re-running them.
- **Auto-waiting + retry-by-default**: significantly fewer "did the page
  finish loading" races than Cypress.
- **Cheap browser contexts**: each test runs in an isolated context, no
  full-browser spin-up overhead per spec.

## Running locally

1. Copy `.env.example` (from `apps/front-e2e/`) to `.env` here — the same
   `CYPRESS_*` vars are reused intentionally to avoid duplicate secret
   plumbing during the pilot.
2. Start the frontend dev server and the API (see the root README).
3. Run the tests:

```bash
# Headless run
yarn nx e2e @zerologementvacant/front-e2e-pw

# Interactive UI mode (best for debugging — pick a test, watch it run,
# step through the timeline)
yarn nx e2e:ui @zerologementvacant/front-e2e-pw

# Record a new test by clicking through the app
yarn nx e2e:codegen @zerologementvacant/front-e2e-pw
```

## Inspecting a failure trace

CI artifacts include `trace.zip` for any test that fails. Open it locally:

```bash
yarn workspace @zerologementvacant/front-e2e-pw exec playwright show-trace path/to/trace.zip
```

## Coverage

- `tests/sign-in.spec.ts` — happy-path login, header reflects the
  logged-in state, cookie set correctly.
- `tests/protected-route.spec.ts` — anonymous request to a protected
  route is redirected to `/connexion`; after login the user lands back
  on the requested URL.
- `tests/change-establishment.spec.ts` — establishment switcher in the
  header changes the active establishment without a full reload.
- `tests/sign-out.spec.ts` — sign-out reverts the header, clears the
  session cookie, and protected routes redirect again.
- `tests/suspended-user.spec.ts` — a suspended user sees the
  SuspendedUserModal.
