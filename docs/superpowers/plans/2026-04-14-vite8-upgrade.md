# Vite 8 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Vite 7 → 8, replace the deprecated `@vitejs/plugin-react-swc` with `@vitejs/plugin-react` v6 (Oxc-based), and measure the performance impact on build, test, and dev server startup.

**Architecture:** Run a temporary benchmark script before and after the upgrade to capture wall-clock timings for the three main Vite-driven processes. Package changes are confined to `package.json`; the only config change is a one-line import swap in `frontend/vite.config.mts`.

**Tech Stack:** Vite 8, `@vitejs/plugin-react` v6 (Oxc), Yarn v4, Nx 22

---

## File Map

| File | Change |
|---|---|
| `benchmark.sh` (repo root, **not committed**) | Created temporarily; deleted after results are recorded |
| `docs/benchmarks/vite8-upgrade.md` | Created; records before/after timing results |
| `package.json` | `vite` 7→^8, `@vitejs/plugin-react` 4→^6, remove `@vitejs/plugin-react-swc` |
| `frontend/vite.config.mts` | Swap plugin import |

---

## Task 1: Write benchmark script and record baseline

**Files:**
- Create: `benchmark.sh` (repo root, temporary — do not `git add`)

- [ ] **Step 1: Write `benchmark.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "======================================="
echo " Vite benchmark"
echo "======================================="

# --- Production build ---
echo ""
echo "--- Production build ---"
rm -rf node_modules/.vite/frontend frontend/dist
time yarn nx build frontend --skip-nx-cache

# --- Test suite ---
echo ""
echo "--- Test suite ---"
rm -rf node_modules/.vite/frontend
time yarn nx test frontend --skip-nx-cache

# --- Dev server cold start ---
echo ""
echo "--- Dev server cold start ---"
rm -rf node_modules/.vite/frontend

TMPFILE=$(mktemp)
yarn nx dev frontend 2>&1 | tee "$TMPFILE" &
NX_PID=$!

while ! grep -q "ready in" "$TMPFILE" 2>/dev/null; do
  sleep 0.1
done
grep "ready in" "$TMPFILE"

kill "$NX_PID" 2>/dev/null
wait "$NX_PID" 2>/dev/null || true
rm -f "$TMPFILE"
```

- [ ] **Step 2: Make it executable and run**

```bash
chmod +x benchmark.sh
./benchmark.sh 2>&1 | tee /tmp/benchmark-before.txt
```

Expected: all three processes complete without error. Note the timing output — you'll need it in the next step.

- [ ] **Step 3: Create `docs/benchmarks/vite8-upgrade.md` with baseline results**

```bash
mkdir -p docs/benchmarks
```

Create `docs/benchmarks/vite8-upgrade.md` with this structure, filling in the actual measured values from `/tmp/benchmark-before.txt`:

```markdown
# Vite 8 Upgrade — Benchmark Results

## Environment

- Date: 2026-04-14
- Machine: <!-- e.g. MacBook Pro M3, 16 GB -->
- Node: <!-- node --version -->
- Yarn: <!-- yarn --version -->

## Before (Vite 7.2.2 + plugin-react-swc 3.11.0)

| Metric | Time |
|---|---|
| Production build | <!-- e.g. 45.2s --> |
| Test suite | <!-- e.g. 32.1s --> |
| Dev server cold start | <!-- e.g. ready in 1843 ms --> |

## After (Vite 8 + plugin-react 6)

| Metric | Time |
|---|---|
| Production build | <!-- fill after upgrade --> |
| Test suite | <!-- fill after upgrade --> |
| Dev server cold start | <!-- fill after upgrade --> |

## Delta

| Metric | Before | After | Δ |
|---|---|---|---|
| Production build | | | |
| Test suite | | | |
| Dev server cold start | | | |
```

- [ ] **Step 4: Commit the empty benchmark doc**

```bash
git add docs/benchmarks/vite8-upgrade.md
git commit -m "chore: add vite8 benchmark results doc (before)"
```

---

## Task 2: Upgrade packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update versions and remove the SWC plugin**

In `package.json`, make these changes in the `devDependencies` section:

```diff
-    "@vitejs/plugin-react": "4.7.0",
-    "@vitejs/plugin-react-swc": "3.11.0",
+    "@vitejs/plugin-react": "^6.0.0",
```

```diff
-    "vite": "7.2.2",
+    "vite": "^8.0.0",
```

Leave `vitest` (4.0.9) and `@nx/vite` / `@nx/vitest` (22.4.5) unchanged for now — they will be handled in the next step if yarn reports peer dep errors.

- [ ] **Step 2: Install and resolve peer deps**

```bash
yarn install
```

If yarn reports peer dependency conflicts involving `vitest` or `@nx/vite`, bump them to their latest compatible versions:

```bash
# Only if needed:
yarn up vitest@latest @nx/vite@latest @nx/vitest@latest
```

Re-run `yarn install` until clean.

- [ ] **Step 3: Commit the package changes**

```bash
git add package.json yarn.lock
git commit -m "chore: upgrade vite to v8 and @vitejs/plugin-react to v6"
```

---

## Task 3: Update frontend Vite config

**Files:**
- Modify: `frontend/vite.config.mts:3`

- [ ] **Step 1: Swap the plugin import**

In `frontend/vite.config.mts`, replace line 3:

```diff
-import react from '@vitejs/plugin-react-swc';
+import react from '@vitejs/plugin-react';
```

No other changes needed — the `react()` call on line 26 is identical for both plugins.

- [ ] **Step 2: Verify TypeScript is happy**

```bash
yarn nx typecheck frontend
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.mts
git commit -m "chore(frontend): replace plugin-react-swc with plugin-react (oxc)"
```

---

## Task 4: Verify everything passes

- [ ] **Step 1: Run the build**

```bash
yarn nx build frontend --skip-nx-cache
```

Expected: build completes without errors, output in `frontend/dist/`.

- [ ] **Step 2: Run the test suite**

```bash
yarn nx test frontend --skip-nx-cache
```

Expected: all tests pass.

- [ ] **Step 3: Start the dev server and verify it comes up**

```bash
yarn nx dev frontend
```

Expected: Vite prints "ready in Xms" and the app loads at `http://localhost:3000`. Kill with Ctrl+C.

---

## Task 5: Record post-upgrade benchmark and commit results

- [ ] **Step 1: Run the benchmark again**

```bash
./benchmark.sh 2>&1 | tee /tmp/benchmark-after.txt
```

- [ ] **Step 2: Fill in the "After" and "Delta" sections in `docs/benchmarks/vite8-upgrade.md`**

Open `/tmp/benchmark-after.txt`, copy the timings into the "After" table, and compute the delta for each metric.

- [ ] **Step 3: Delete the benchmark script**

```bash
rm benchmark.sh
```

- [ ] **Step 4: Commit the completed results**

```bash
git add docs/benchmarks/vite8-upgrade.md
git commit -m "chore: record vite8 benchmark results"
```

---

## Task 6: Open PR

- [ ] **Step 1: Push and open PR**

```bash
git push -u origin build/reduce-bundle-size
gh pr create --title "chore: upgrade Vite to v8 and drop plugin-react-swc" --body "$(cat <<'EOF'
## Summary
- Upgrades Vite from 7.2.2 to v8
- Upgrades `@vitejs/plugin-react` from 4.7.0 to v6 (Oxc-based transforms)
- Removes deprecated `@vitejs/plugin-react-swc`
- Benchmark results recorded in `docs/benchmarks/vite8-upgrade.md`

## Test plan
- [ ] `yarn nx build frontend` passes
- [ ] `yarn nx test frontend` passes
- [ ] `yarn nx dev frontend` starts without errors
- [ ] Benchmark results show equal or improved times

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
