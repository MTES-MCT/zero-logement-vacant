# Remove /api Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant `/api` path prefix from all server routes and update every consumer — RTK Query base URL, MSW mock handlers, and controller test files.

**Architecture:** Three mechanical changes in sequence: (1) server router mounts in `server.ts`, (2) RTK Query base URL in `api.service.ts`, (3) find-replace across 21 controller test files and 18 MSW handler files. No logic changes anywhere.

**Tech Stack:** Express, RTK Query, MSW 2, Vitest, supertest

**Worktree:** `~/dev/zero-logement-vacant.refactor-remove-api-prefix`

> All commands below must be run from the worktree root unless stated otherwise.

---

### Task 1: Remove `/api` from server router mounts

**Files:**
- Modify: `server/src/infra/server.ts:152-153`

- [ ] **Step 1: Apply the change**

In `server/src/infra/server.ts`, replace lines 152–153:

```ts
// Before
app.use('/api', unprotectedRouter);
app.use('/api', protectedRouter);

// After
app.use('/', unprotectedRouter);
app.use('/', protectedRouter);
```

- [ ] **Step 2: Verify controller tests now fail (expected)**

```bash
yarn nx test server -- server/src/controllers/test/establishment-api.test.ts
```

Expected: tests fail with `404` responses — the Express app no longer serves routes at `/api/establishments`, but the test files still request that path. This confirms the server change is live.

- [ ] **Step 3: Strip `/api/` from all 21 server controller test files**

```bash
find server/src/controllers -name "*.test.ts" | xargs sed -i '' 's|/api/|/|g'
```

This rewrites every occurrence of `/api/` to `/` in route strings. For example:
- `'/api/housing'` → `'/housing'`
- `` `/api/housing/${id}` `` → `` `/housing/${id}` ``
- `request(url).post('/api/authenticate')` → `request(url).post('/authenticate')`

- [ ] **Step 4: Verify the fix — run all server tests**

```bash
yarn nx test server
```

Expected: all tests pass. If any file still fails with 404, grep it for remaining `/api/` occurrences:

```bash
grep -n '/api/' server/src/controllers/test/failing-file.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/src/infra/server.ts server/src/controllers
git commit -m "refactor(server): remove /api prefix from router mounts"
```

---

### Task 2: Remove `/api` from frontend RTK Query base URL and MSW handlers

**Files:**
- Modify: `frontend/src/services/api.service.ts:38`
- Modify: `frontend/src/mocks/handlers/*.ts` (18 files)

- [ ] **Step 1: Apply the RTK Query change**

In `frontend/src/services/api.service.ts`, replace line 38:

```ts
// Before
baseUrl: `${config.apiEndpoint}/api`,

// After
baseUrl: config.apiEndpoint,
```

- [ ] **Step 2: Verify frontend tests now fail (expected)**

```bash
yarn nx test frontend -- frontend/src/mocks/handlers/housing-handlers.ts
```

Expected: tests fail — RTK Query now requests `/housing` but the MSW handlers still intercept `${config.apiEndpoint}/api/housing`. This confirms the frontend change is live.

- [ ] **Step 3: Strip `/api/` from all 18 MSW handler files**

```bash
find frontend/src/mocks/handlers -name "*.ts" | xargs sed -i '' 's|${config.apiEndpoint}/api/|${config.apiEndpoint}/|g'
```

This rewrites every MSW handler URL. For example:
- `` `${config.apiEndpoint}/api/housing` `` → `` `${config.apiEndpoint}/housing` ``
- `` `${config.apiEndpoint}/api/housing/count` `` → `` `${config.apiEndpoint}/housing/count` ``

- [ ] **Step 4: Verify the fix — run all frontend tests**

```bash
yarn nx test frontend
```

Expected: all tests pass. If any handler still fails to intercept, grep for remaining `/api/`:

```bash
grep -rn '/api/' frontend/src/mocks/handlers/
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api.service.ts frontend/src/mocks/handlers
git commit -m "refactor(frontend): remove /api prefix from RTK Query base URL and MSW handlers"
```

---

### Task 3: Final verification and push

- [ ] **Step 1: Run the full test suite**

```bash
yarn nx run-many -t test --exclude=zero-logement-vacant
```

Expected: all projects pass.

- [ ] **Step 2: Confirm no stray `/api/` references remain in route-related code**

```bash
grep -rn '/api/' \
  server/src/infra/server.ts \
  server/src/routers/ \
  frontend/src/services/api.service.ts \
  frontend/src/mocks/handlers/
```

Expected: no output. (`/api-docs` in `openapi.ts` is unrelated and should not appear here.)

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin refactor/remove-api-prefix
gh pr create \
  --title "refactor: remove redundant /api prefix from API routes" \
  --body "$(cat <<'EOF'
## Summary

- Removes the `/api` path prefix from Express router mounts in `server.ts` — the server is already deployed on the `api.*` subdomain, making the prefix redundant
- Updates the RTK Query base URL in `api.service.ts` to drop the appended `/api`
- Updates all 21 server controller test files and 18 MSW handler files via find-replace

## Test plan

- [ ] `yarn nx test server` passes
- [ ] `yarn nx test frontend` passes
- [ ] Manual smoke test: sign in and load the housing list in local dev

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
