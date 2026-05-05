# Vite 8 Upgrade Design

**Date:** 2026-04-14
**Branch:** build/reduce-bundle-size

## Goal

Upgrade Vite from 7 to 8 and consolidate the React plugin stack, then measure the performance impact.

## Context

- `frontend/` uses `@vitejs/plugin-react-swc` (SWC-based transforms)
- `packages/pdf/` uses `@vitejs/plugin-react` (Babel-based transforms)
- `@vitejs/plugin-react-swc` is now deprecated; `@vitejs/plugin-react` v6 uses Oxc (faster than SWC), fully integrated in Vite 8

## Benchmark Approach

A temporary `benchmark.sh` script (not committed) clears caches and times three processes before and after the upgrade:

1. **Production build** — `yarn nx build frontend`
2. **Dev server cold start** — `yarn nx dev frontend`, time to "ready in Xms" line, then kill
3. **Test suite** — `yarn nx test frontend`

Caches to clear before each run: `node_modules/.vite/`, `frontend/dist/`, `frontend/.vite/`.

Results (before and after) are saved to `docs/benchmarks/vite8-upgrade.md` and committed.

## Package Changes

| Package | Action | From | To |
|---|---|---|---|
| `vite` | upgrade | `7.2.2` | `^8` |
| `@vitejs/plugin-react` | upgrade | `4.7.0` | `^6` |
| `@vitejs/plugin-react-swc` | **remove** | `3.11.0` | — |

Also check `vitest` and `@nx/vite` for peer dependency constraints; bump if required.

## Config Changes

**`frontend/vite.config.mts`:** replace SWC plugin import with the standard one.

```diff
- import react from '@vitejs/plugin-react-swc';
+ import react from '@vitejs/plugin-react';
```

**`packages/pdf/vite.config.mts`:** no import change needed (already uses `@vitejs/plugin-react`), only the package version bump applies.

## Success Criteria

- `yarn nx build frontend`, `yarn nx dev frontend`, and `yarn nx test frontend` all pass after the upgrade
- Benchmark shows equal or improved times across all three measurements
