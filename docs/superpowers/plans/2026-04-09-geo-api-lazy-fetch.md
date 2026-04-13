# Geo API Lazy Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two duplicated hardcoded `departmentToRegion` lookup tables and `isCommuneInPerimeter` helpers in `perimeterService.ts` and `UserPerimeterApi.ts` with calls to the existing `AdministrativeDivisionService`, wrapped with `p-memoize` for per-call lazy caching.

**Architecture:** `geo-api.ts` gains (1) `p-memoize` wrapping in `createGeoAPI()` so each method caches results per argument, (2) a module-level exported singleton `geoAPI`, and (3) an exported `getDepartmentFromCommune` pure utility. Both `perimeterService.ts` and `UserPerimeterApi.ts` drop their duplicated helpers, import from `~/services/administrative-division/geo-api`, and call `geoAPI.getDepartment(code)` to resolve department→region. The four affected public functions become `async`; their three call sites each add a single `await`.

**Tech Stack:** TypeScript, `p-memoize@8` (already installed), `geo.api.gouv.fr` via existing `GeoAPI`, Vitest

---

## File Map

| Action | File |
|--------|------|
| **Modify** | `server/src/services/administrative-division/geo-api.ts` |
| **Create** | `server/src/services/administrative-division/geo-api.test.ts` |
| **Modify** | `server/src/services/ceremaService/perimeterService.ts` |
| **Modify** | `server/src/models/UserPerimeterApi.ts` |
| **Modify** | `server/src/middlewares/auth.ts` |
| **Modify** | `server/src/controllers/auth-controller.ts` |
| **Modify** | `server/src/controllers/userController.ts` |

---

## Task 1: Add `p-memoize`, singleton, and `getDepartmentFromCommune` to `geo-api.ts`

**Files:**
- Modify: `server/src/services/administrative-division/geo-api.ts`
- Create: `server/src/services/administrative-division/geo-api.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/services/administrative-division/geo-api.test.ts`:

```typescript
import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';
import { createGeoAPI, getDepartmentFromCommune } from './geo-api';

const GEO_API = 'https://geo.api.gouv.fr';

afterEach(() => {
  nock.cleanAll();
});

describe('getDepartmentFromCommune', () => {
  it('returns first 2 digits for metropolitan France', () => {
    expect(getDepartmentFromCommune('75056')).toBe('75');
    expect(getDepartmentFromCommune('13055')).toBe('13');
    expect(getDepartmentFromCommune('33063')).toBe('33');
  });

  it('returns 3-digit code for DOM-TOM (97x)', () => {
    expect(getDepartmentFromCommune('97105')).toBe('971'); // Guadeloupe
    expect(getDepartmentFromCommune('97209')).toBe('972'); // Martinique
    expect(getDepartmentFromCommune('97302')).toBe('973'); // Guyane
    expect(getDepartmentFromCommune('97411')).toBe('974'); // La Réunion
    expect(getDepartmentFromCommune('97608')).toBe('976'); // Mayotte
  });

  it('returns 2-char code for Corsica', () => {
    expect(getDepartmentFromCommune('2A004')).toBe('2A');
    expect(getDepartmentFromCommune('2B033')).toBe('2B');
  });

  it('returns empty string for invalid input', () => {
    expect(getDepartmentFromCommune('')).toBe('');
    expect(getDepartmentFromCommune('7')).toBe('');
  });
});

describe('createGeoAPI', () => {
  it('returns the department with its region code', async () => {
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });

    const api = createGeoAPI();
    const dept = await api.getDepartment('75');

    expect(dept).toMatchObject({ code: '75', region: '11' });
    expect(nock.isDone()).toBe(true);
  });

  it('returns null when the API returns a 404', async () => {
    nock(GEO_API)
      .get('/departements/99')
      .query({ fields: 'codeRegion' })
      .reply(404);

    const api = createGeoAPI();
    const dept = await api.getDepartment('99');

    expect(dept).toBeNull();
  });

  it('makes only one HTTP request for repeated calls with the same code', async () => {
    // nock intercepts exactly once by default — if a second HTTP request were made,
    // nock would throw "Nock: No match for request" and the test would fail.
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .once()
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });

    const api = createGeoAPI();
    const first = await api.getDepartment('75');
    const second = await api.getDepartment('75'); // served from memoize cache

    expect(first).toMatchObject({ code: '75', region: '11' });
    expect(second).toMatchObject({ code: '75', region: '11' });
    expect(nock.isDone()).toBe(true); // only one HTTP call was made
  });

  it('makes one HTTP request per unique department code', async () => {
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .once()
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });
    nock(GEO_API)
      .get('/departements/69')
      .query({ fields: 'codeRegion' })
      .once()
      .reply(200, { code: '69', nom: 'Rhône', codeRegion: '84' });

    const api = createGeoAPI();
    await api.getDepartment('75');
    await api.getDepartment('69');
    await api.getDepartment('75'); // cached

    expect(nock.isDone()).toBe(true); // exactly 2 HTTP calls total
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2 && yarn nx test server -- server/src/services/administrative-division/geo-api.test.ts 2>&1 | tail -15
```

Expected: FAIL — `getDepartmentFromCommune` is not exported, memoization not in place.

- [ ] **Step 3: Update `geo-api.ts`**

Read the current file, then apply these changes:

**3a. Add `p-memoize` import at the top:**
```typescript
import pMemoize from 'p-memoize';
```

**3b. Add `getDepartmentFromCommune` export before the `GeoAPI` class:**
```typescript
/**
 * Extract department code from a commune INSEE code.
 * Pure string manipulation — no API call needed.
 *
 * INSEE codes are 5 chars:
 *  - DOM-TOM (starts with 97): first 3 chars are the department code
 *  - Corsica (starts with 2A or 2B): first 2 chars
 *  - Metropolitan France: first 2 digits
 */
export function getDepartmentFromCommune(communeCode: string): string {
  if (!communeCode || communeCode.length < 2) return '';
  if (communeCode.startsWith('97')) return communeCode.substring(0, 3);
  if (communeCode.startsWith('2A') || communeCode.startsWith('2B')) {
    return communeCode.substring(0, 2);
  }
  return communeCode.substring(0, 2);
}
```

**3b-bis. Make `getDepartment` fulfill its `Department | null` contract** — add a try/catch so API errors (404, network failure) return `null` rather than throwing. The Zod parse failure also becomes `null`:

```typescript
async getDepartment(code: string): Promise<Department | null> {
  try {
    const { data } = await this.http.get<unknown>(`/departements/${code}`);
    const department = departmentSchema.parse(data);
    return {
      code: department.code,
      name: department.nom,
      region: department.codeRegion
    };
  } catch {
    return null;
  }
}
```

**3c. Replace `createGeoAPI()` to wrap each method with `pMemoize`:**
```typescript
export function createGeoAPI(): AdministrativeDivisionService {
  const api = new GeoAPI();
  return {
    getCommune: pMemoize(api.getCommune.bind(api)),
    getIntercommunality: pMemoize(api.getIntercommunality.bind(api)),
    getDepartment: pMemoize(api.getDepartment.bind(api)),
    getRegion: pMemoize(api.getRegion.bind(api))
  };
}
```

**3d. Add module-level singleton export after `createGeoAPI`:**
```typescript
/**
 * Singleton GeoAPI instance with per-argument memoization.
 * Use this throughout the server — do not call createGeoAPI() directly.
 */
export const geoAPI = createGeoAPI();
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2 && yarn nx test server -- server/src/services/administrative-division/geo-api.test.ts 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2 && git add server/src/services/administrative-division/geo-api.ts server/src/services/administrative-division/geo-api.test.ts && git commit -m "feat(server): add p-memoize to GeoAPI, export singleton and getDepartmentFromCommune"
```

---

## Task 2: Update `perimeterService.ts`

**Files:**
- Modify: `server/src/services/ceremaService/perimeterService.ts`

- [ ] **Step 1: Edit the file**

Read `server/src/services/ceremaService/perimeterService.ts`, then apply:

**2a. Replace the existing imports block at the top** — add the new imports:
```typescript
import { CeremaPerimeter, CeremaGroup, CeremaUser } from './consultUserService';
import { logger } from '~/infra/logger';
import {
  getDepartmentFromCommune,
  geoAPI
} from '~/services/administrative-division/geo-api';
```

**2b. Delete these three items entirely** (they are replaced by the imports above):
- The `getDepartmentFromCommune` function (lines 25–42)
- The `getRegionFromDepartment` function (lines 48–93) including the full `departmentToRegion` object

**2c. Replace `isCommuneInPerimeter` with the async version:**
```typescript
async function isCommuneInPerimeter(
  communeCode: string,
  perimeter: CeremaPerimeter
): Promise<boolean> {
  // France entière = access to everything
  if (perimeter.fr_entiere) {
    return true;
  }

  // Direct commune match
  if (perimeter.comm.includes(communeCode)) {
    return true;
  }

  // Department match
  const departmentCode = getDepartmentFromCommune(communeCode);
  if (departmentCode && perimeter.dep.includes(departmentCode)) {
    return true;
  }

  // Region match — lazy fetch via GeoAPI, memoized per department code
  const department = await geoAPI.getDepartment(departmentCode);
  if (department?.region && perimeter.reg.includes(department.region)) {
    return true;
  }

  return false;
}
```

**2d. Make `verifyAccessRights` async** — change its signature and update the `.some()` call:

Change:
```typescript
export function verifyAccessRights(
```
to:
```typescript
export async function verifyAccessRights(
```

Replace the synchronous `.some()` call:
```typescript
// Before:
const hasValidPerimeter = establishmentGeoCodes.some((geoCode) =>
  isCommuneInPerimeter(geoCode, ceremaUser.perimeter!)
);

// After:
const hasValidPerimeter = (
  await Promise.all(
    establishmentGeoCodes.map((geoCode) =>
      isCommuneInPerimeter(geoCode, ceremaUser.perimeter!)
    )
  )
).some(Boolean);
```

- [ ] **Step 2: Verify no old helpers remain**

```bash
grep -n "departmentToRegion\|getRegionFromDepartment\|getDepartmentFromCommune" /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2/server/src/services/ceremaService/perimeterService.ts
```

Expected: no output. (`getDepartmentFromCommune` should only appear on the import line.)

- [ ] **Step 3: Commit**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2 && git add server/src/services/ceremaService/perimeterService.ts && git commit -m "refactor(server): replace hardcoded dept→region table in perimeterService with geoAPI"
```

---

## Task 3: Update `UserPerimeterApi.ts`

**Files:**
- Modify: `server/src/models/UserPerimeterApi.ts`

- [ ] **Step 1: Edit the file**

Read `server/src/models/UserPerimeterApi.ts`, then apply:

**3a. Add import at the very top of the file:**
```typescript
import {
  getDepartmentFromCommune,
  geoAPI
} from '~/services/administrative-division/geo-api';
```

**3b. Delete these two items entirely:**
- The `getDepartmentFromCommune` function (lines 50–67)
- The `getRegionFromDepartment` function (lines 72–115) including the full `departmentToRegion` object

**3c. Replace `isCommuneInUserPerimeter` with the async version:**
```typescript
async function isCommuneInUserPerimeter(
  communeCode: string,
  perimeter: UserPerimeterApi
): Promise<boolean> {
  // France entière = access to everything
  if (perimeter.frEntiere) {
    return true;
  }

  // Direct commune match
  if (perimeter.geoCodes.includes(communeCode)) {
    return true;
  }

  // Department match
  const departmentCode = getDepartmentFromCommune(communeCode);
  if (departmentCode && perimeter.departments.includes(departmentCode)) {
    return true;
  }

  // Region match — lazy fetch via GeoAPI, memoized per department code
  const department = await geoAPI.getDepartment(departmentCode);
  if (department?.region && perimeter.regions.includes(department.region)) {
    return true;
  }

  return false;
}
```

**3d. Make `filterGeoCodesByPerimeter` async** — update signature and final filter:

Change:
```typescript
export function filterGeoCodesByPerimeter(
  establishmentGeoCodes: string[],
  perimeter: UserPerimeterApi | null,
  establishmentSiren?: string | number
): string[] | undefined {
```
to:
```typescript
export async function filterGeoCodesByPerimeter(
  establishmentGeoCodes: string[],
  perimeter: UserPerimeterApi | null,
  establishmentSiren?: string | number
): Promise<string[] | undefined> {
```

Replace the final `.filter()`:
```typescript
// Before:
return establishmentGeoCodes.filter((geoCode) =>
  isCommuneInUserPerimeter(geoCode, perimeter)
);

// After:
const matched = await Promise.all(
  establishmentGeoCodes.map((geoCode) =>
    isCommuneInUserPerimeter(geoCode, perimeter)
  )
);
return establishmentGeoCodes.filter((_, i) => matched[i]);
```

- [ ] **Step 2: Verify no old helpers remain**

```bash
grep -n "departmentToRegion\|getRegionFromDepartment\|getDepartmentFromCommune" /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2/server/src/models/UserPerimeterApi.ts
```

Expected: no output. (`getDepartmentFromCommune` should only appear on the import line.)

- [ ] **Step 3: Commit**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2 && git add server/src/models/UserPerimeterApi.ts && git commit -m "refactor(server): replace hardcoded dept→region table in UserPerimeterApi with geoAPI"
```

---

## Task 4: Update call sites

**Files:**
- Modify: `server/src/middlewares/auth.ts`
- Modify: `server/src/controllers/auth-controller.ts`
- Modify: `server/src/controllers/userController.ts`

- [ ] **Step 1: Update `auth.ts` (~line 83)**

```typescript
// Before:
request.effectiveGeoCodes = filterGeoCodesByPerimeter(
  establishment.geoCodes,
  userPerimeter,
  establishment.siren
);

// After:
request.effectiveGeoCodes = await filterGeoCodesByPerimeter(
  establishment.geoCodes,
  userPerimeter,
  establishment.siren
);
```

- [ ] **Step 2: Update `auth-controller.ts` — `verifyAccessRights` call (~line 103)**

```typescript
// Before:
const accessRights = verifyAccessRights(
  ceremaUser,
  est.geoCodes,
  est.siren
);

// After:
const accessRights = await verifyAccessRights(
  ceremaUser,
  est.geoCodes,
  est.siren
);
```

- [ ] **Step 3: Update `auth-controller.ts` — `filterGeoCodesByPerimeter` call (~line 402)**

```typescript
// Before:
effectiveGeoCodes = filterGeoCodesByPerimeter(
  establishment.geoCodes,
  userPerimeter,
  establishment.siren
);

// After:
effectiveGeoCodes = await filterGeoCodesByPerimeter(
  establishment.geoCodes,
  userPerimeter,
  establishment.siren
);
```

- [ ] **Step 4: Update `userController.ts` — `verifyAccessRights` call (~line 147)**

```typescript
// Before:
const accessRights = verifyAccessRights(
  matchingCeremaUser,
  userEstablishment.geoCodes,
  userEstablishment.siren
);

// After:
const accessRights = await verifyAccessRights(
  matchingCeremaUser,
  userEstablishment.geoCodes,
  userEstablishment.siren
);
```

- [ ] **Step 5: Run the full server test suite**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2 && yarn nx test server 2>&1 | tail -20
```

Expected: same pass/fail count as before this plan (27 pre-existing failures, no new ones).

- [ ] **Step 6: Commit**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-portaildf-rights-v2 && git add server/src/middlewares/auth.ts server/src/controllers/auth-controller.ts server/src/controllers/userController.ts && git commit -m "refactor(server): await async filterGeoCodesByPerimeter and verifyAccessRights at call sites"
```
