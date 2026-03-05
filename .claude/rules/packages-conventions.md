---
description: Conventions for shared packages (models, schemas, utils, draft)
paths: ["packages/**"]
---

# Packages Conventions

## packages/models
- DTOs: `HousingDTO`, `OwnerDTO` (DTO suffix).
- Payloads: `HousingUpdatePayload` (no DTO suffix).
- Every entity must export a `gen*DTO()` fixture function.
- Frontend and server fixtures must extend these.

## packages/schemas
- Yup schemas shared across workspaces.
- Naming: camelCase, no suffix (`housingUpdatePayload` not `housingUpdatePayloadSchema`).
- Property-based tests mandatory (`@fast-check/vitest`).

## packages/utils
- Pure functions only. No side effects, no framework dependencies.
- Only add utilities used by 2+ workspaces.

## packages/draft
- Experimental — do not depend on stability.

## Cross-package changes
- After changes to `models/` or `schemas/`, run `yarn nx run-many -t typecheck`.
