# Vite 8 Upgrade — Benchmark Results

## Environment

- Date: 2026-04-14
- Machine: MacBook Pro M5 Pro, 48 GB
- Node: v24.14.1
- Yarn: 4.12.0

## Before (Vite 7.2.2 + plugin-react-swc 3.11.0)

| Metric | Time |
|---|---|
| Production build | 11.756s |
| Test suite | 1m 32.271s |
| Dev server cold start | ready in 229 ms |

## After (Vite 8 + plugin-react 6)

| Metric | Time |
|---|---|
| Production build | 3.229s |
| Test suite | 1m 23.017s |
| Dev server cold start | ready in 137 ms |

## Delta

| Metric | Before | After | Δ |
|---|---|---|---|
| Production build | 11.756s | 3.229s | -8.527s |
| Test suite | 1m 32.271s | 1m 23.017s | -9.254s |
| Dev server cold start | 229 ms | 137 ms | -92 ms |
