# Analysis Page Next — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Metabase scalar cards natively in the ZLV frontend behind a `new-analysis-page` PostHog feature flag, replacing the iframe embed for `/analyses/*` routes.

**Architecture:** ZLV backend proxies Metabase API calls using `METABASE_API_TOKEN`. `GET /dashboards/:id` now also fetches dashboard metadata from Metabase and returns the normalized `DashboardDTO` (tabs/cards + existing embed URL for backward compat). New `GET /dashboards/:did/cards/:cid` fetches scalar values. Frontend fires parallel per-card requests, each showing a skeleton until resolved.

**Tech Stack:** Express + Vitest + supertest (backend); RTK Query + MSW v2 + Testing Library + DSFR (`@codegouvfr/react-dsfr`) + MUI Emotion (frontend)

**Spec:** `docs/superpowers/specs/2026-06-02-analysis-page-next-design.md`

---

## File Map

**Create:**
- `server/src/errors/dashcardMissingError.ts`
- `server/src/controllers/test/dashboard-api.test.ts`
- `frontend/src/mocks/handlers/dashboard-handlers.ts`
- `frontend/src/components/Analysis/AnalysisCard.tsx`
- `frontend/src/components/Analysis/test/AnalysisCard.test.tsx`
- `frontend/src/views/Analysis/AnalysisViewNext.tsx`
- `frontend/src/views/Analysis/test/AnalysisViewNext.test.tsx`

**Modify:**
- `packages/models/src/DashboardDTO.ts`
- `packages/models/src/test/fixtures.ts`
- `server/src/models/DashboardApi.ts`
- `server/src/controllers/dashboardController.ts`
- `server/src/routers/protected.ts`
- `frontend/src/mocks/handlers/index.ts`
- `frontend/src/services/dashboard.service.ts`
- `frontend/src/layouts/FeatureFlagLayout.tsx`
- `frontend/src/App.tsx`

---

## Task 1: Update DashboardDTO and add fixtures

**Files:**
- Modify: `packages/models/src/DashboardDTO.ts`
- Modify: `packages/models/src/test/fixtures.ts`

- [ ] **Step 1: Replace DashboardDTO.ts**

```typescript
// packages/models/src/DashboardDTO.ts

export type CardType = 'flat-number' | 'percentage';

export interface CardCommon {
  id: number;
  type: CardType;
  title: string;
  description: string | null;
  decimals: number;
  position: { col: number; row: number };
  size: { width: number; height: number };
}

export interface FlatNumberCard extends CardCommon {
  type: 'flat-number';
}

export interface PercentageCard extends CardCommon {
  type: 'percentage';
}

export type DashboardCard = FlatNumberCard | PercentageCard;

export interface Tab {
  id: number;
  title: string;
  cards: ReadonlyArray<DashboardCard>;
}

interface WithTabs {
  tabs: ReadonlyArray<Tab>;
}

interface WithoutTabs {
  cards: ReadonlyArray<DashboardCard>;
}

// url is transitional — remove when new-analysis-page flag is deleted
export type DashboardDTO = { id: number; url: string } & (WithTabs | WithoutTabs);

export interface CardDataDTO {
  id: number;
  data: number;
}

export const RESOURCE_VALUES = [
  '6-utilisateurs-de-zlv-sur-votre-structure',
  '7-autres-structures-de-votre-territoires-inscrites-sur-zlv',
  '13-analyses',
  '15-analyses-activites'
] as const;

export type Resource = (typeof RESOURCE_VALUES)[number];
```

- [ ] **Step 2: Add gen functions to fixtures.ts** — append after the last existing gen function:

```typescript
// Append to packages/models/src/test/fixtures.ts
// (add the following imports at the top of the file alongside existing imports)
// import type { CardDataDTO, DashboardCard, DashboardDTO, Tab } from '../DashboardDTO';

export function genFlatNumberCard(
  override?: Partial<DashboardCard>
): DashboardCard {
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    type: 'flat-number',
    title: faker.lorem.words(3),
    description: null,
    decimals: 0,
    position: { col: 0, row: 0 },
    size: { width: 6, height: 4 },
    ...override
  };
}

export function genDashboardDTO(override?: {
  cards?: DashboardCard[];
  tabs?: Tab[];
}): DashboardDTO {
  if (override?.tabs) {
    return {
      id: faker.number.int({ min: 1, max: 999 }),
      url: 'https://stats.zlv.beta.gouv.fr/embed/dashboard/fake-token',
      tabs: override.tabs
    };
  }
  return {
    id: faker.number.int({ min: 1, max: 999 }),
    url: 'https://stats.zlv.beta.gouv.fr/embed/dashboard/fake-token',
    cards: override?.cards ?? [genFlatNumberCard()]
  };
}

export function genCardDataDTO(override?: Partial<CardDataDTO>): CardDataDTO {
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    data: faker.number.int({ min: 0, max: 100000 }),
    ...override
  };
}
```

- [ ] **Step 3: Run typecheck**

```bash
yarn nx run-many -t typecheck --projects=@zerologementvacant/models
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/models/src/DashboardDTO.ts packages/models/src/test/fixtures.ts
git commit -m "feat(models): update DashboardDTO with native card types and CardDataDTO"
```

---

## Task 2: Add Metabase API helpers to DashboardApi.ts

**Files:**
- Modify: `server/src/models/DashboardApi.ts`

- [ ] **Step 1: Replace DashboardApi.ts**

```typescript
// server/src/models/DashboardApi.ts
import type {
  DashboardCard,
  DashboardDTO,
  Resource,
  Tab
} from '@zerologementvacant/models';

// ─── Metabase internal types (minimal subset) ────────────────────────────────

interface MetabaseVisualizationSettings {
  'number.style'?: string;
  'scalar.decimals'?: number;
  column_settings?: Record<
    string,
    { number_style?: string; decimals?: number }
  >;
}

interface MetabaseCard {
  id: number;
  name: string;
  display: string;
  description: string | null;
  visualization_settings: MetabaseVisualizationSettings;
}

interface MetabaseDashcard {
  id: number;
  card_id: number;
  row: number;
  col: number;
  size_x: number;
  size_y: number;
  card: MetabaseCard;
}

interface MetabaseTab {
  id: number;
  name: string;
  ordered_cards: MetabaseDashcard[];
}

interface MetabaseDashboard {
  id: number;
  ordered_tabs?: MetabaseTab[];
  dashcards: MetabaseDashcard[];
}

interface MetabaseQueryResult {
  data: { rows: unknown[][] };
  status: string;
}

// ─── Slug → numeric ID ───────────────────────────────────────────────────────

export function getResource(id: Resource): number {
  switch (id) {
    case '6-utilisateurs-de-zlv-sur-votre-structure':
      return 6;
    case '7-autres-structures-de-votre-territoires-inscrites-sur-zlv':
      return 7;
    case '13-analyses':
      return 13;
    case '15-analyses-activites':
      return 15;
  }
}

// ─── Embed URL (transitional — remove when new-analysis-page flag is removed) ─

interface CreateURLOptions {
  domain: string;
  token: string;
}

export function createURL(opts: CreateURLOptions): string {
  return `${opts.domain}/embed/dashboard/${opts.token}#bordered=true&titled=false`;
}

// ─── Metabase API client ──────────────────────────────────────────────────────

export async function fetchMetabaseDashboard(
  numericId: number,
  domain: string,
  apiToken: string
): Promise<MetabaseDashboard> {
  const response = await fetch(`${domain}/api/dashboard/${numericId}`, {
    headers: { 'X-Api-Key': apiToken }
  });
  if (!response.ok) {
    throw new Error(`Metabase API error: ${response.status}`);
  }
  return response.json() as Promise<MetabaseDashboard>;
}

export async function fetchCardQueryData(opts: {
  dashboardId: number;
  dashcardId: number;
  cardId: number;
  domain: string;
  apiToken: string;
}): Promise<number> {
  const { dashboardId, dashcardId, cardId, domain, apiToken } = opts;
  const response = await fetch(
    `${domain}/api/dashboard/${dashboardId}/dashcard/${dashcardId}/card/${cardId}/query`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ parameters: [] })
    }
  );
  if (!response.ok) {
    throw new Error(`Metabase card query error: ${response.status}`);
  }
  const result = (await response.json()) as MetabaseQueryResult;
  return result.data.rows[0][0] as number;
}

// ─── Normalization ────────────────────────────────────────────────────────────

function detectCardType(
  settings: MetabaseVisualizationSettings
): 'flat-number' | 'percentage' {
  if (settings['number.style'] === 'percent') return 'percentage';
  const hasPercentColumn = Object.values(
    settings.column_settings ?? {}
  ).some((col) => col.number_style === 'percent');
  return hasPercentColumn ? 'percentage' : 'flat-number';
}

function detectDecimals(settings: MetabaseVisualizationSettings): number {
  if (settings['scalar.decimals'] !== undefined) {
    return settings['scalar.decimals'];
  }
  return (
    Object.values(settings.column_settings ?? {}).find(
      (col) => col.decimals !== undefined
    )?.decimals ?? 0
  );
}

function normalizeDashcard(dashcard: MetabaseDashcard): DashboardCard | null {
  if (dashcard.card.display !== 'scalar') return null;
  const { card } = dashcard;
  return {
    id: dashcard.id,
    type: detectCardType(card.visualization_settings),
    title: card.name,
    description: card.description,
    decimals: detectDecimals(card.visualization_settings),
    position: { col: dashcard.col, row: dashcard.row },
    size: { width: dashcard.size_x, height: dashcard.size_y }
  };
}

export function normalizeDashboard(
  raw: MetabaseDashboard
): Pick<DashboardDTO, 'tabs' | 'cards'> {
  if (raw.ordered_tabs && raw.ordered_tabs.length > 0) {
    const tabs: Tab[] = raw.ordered_tabs.map((tab) => ({
      id: tab.id,
      title: tab.name,
      cards: tab.ordered_cards
        .map(normalizeDashcard)
        .filter((c): c is DashboardCard => c !== null)
    }));
    return { tabs };
  }
  return {
    cards: raw.dashcards
      .map(normalizeDashcard)
      .filter((c): c is DashboardCard => c !== null)
  };
}

export function findDashcard(
  raw: MetabaseDashboard,
  dashcardId: number
): { dashcardId: number; cardId: number } | null {
  const allDashcards =
    raw.ordered_tabs?.length
      ? raw.ordered_tabs.flatMap((t) => t.ordered_cards)
      : raw.dashcards;
  const found = allDashcards.find((dc) => dc.id === dashcardId);
  if (!found) return null;
  if (normalizeDashcard(found) === null) return null;
  return { dashcardId: found.id, cardId: found.card_id };
}
```

- [ ] **Step 2: Run typecheck**

```bash
yarn nx typecheck server
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/DashboardApi.ts
git commit -m "feat(server): add Metabase API client and dashboard normalization helpers"
```

---

## Task 3: Create DashcardMissingError

**Files:**
- Create: `server/src/errors/dashcardMissingError.ts`

- [ ] **Step 1: Create error class**

```typescript
// server/src/errors/dashcardMissingError.ts
import { constants } from 'node:http2';

import { HttpError } from './httpError';

export default class DashcardMissingError
  extends HttpError
  implements HttpError
{
  constructor(dashcardId: number) {
    super({
      name: 'DashcardMissingError',
      message: `Dashcard ${dashcardId} not found or not a supported type`,
      status: constants.HTTP_STATUS_NOT_FOUND
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/errors/dashcardMissingError.ts
git commit -m "feat(server): add DashcardMissingError"
```

---

## Task 4: Update GET /dashboards/:id + add GET /dashboards/:did/cards/:cid (TDD)

**Files:**
- Create: `server/src/controllers/test/dashboard-api.test.ts`
- Modify: `server/src/controllers/dashboardController.ts`
- Modify: `server/src/routers/protected.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// server/src/controllers/test/dashboard-api.test.ts
import { constants } from 'node:http2';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { CardDataDTO, DashboardDTO } from '@zerologementvacant/models';
import { createServer } from '~/infra/server';
import { genEstablishmentApi, genUserApi } from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';

const establishment = genEstablishmentApi();
const user = genUserApi(establishment.id);

const mockMetabaseDashboard = {
  id: 13,
  ordered_tabs: [],
  dashcards: [
    {
      id: 929,
      card_id: 771,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      card: {
        id: 771,
        name: 'Total logements vacants',
        display: 'scalar',
        description: null,
        visualization_settings: { 'scalar.decimals': 0 }
      }
    }
  ]
};

const mockCardQueryResult = {
  data: { rows: [[51884]], cols: [] },
  status: 'completed'
};

describe('Dashboard API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /dashboards/:id', () => {
    it('returns DashboardDTO with url and cards', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockMetabaseDashboard
      } as Response);

      const response = await request(url)
        .get('/api/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect(body.id).toBe(13);
      expect(body.url).toMatch(/embed\/dashboard/);
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0].id).toBe(929);
        expect(body.cards[0].type).toBe('flat-number');
        expect(body.cards[0].title).toBe('Total logements vacants');
      }
    });

    it('returns 422 for unknown slug', async () => {
      const response = await request(url)
        .get('/api/dashboards/unknown-slug')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
    });
  });

  describe('GET /dashboards/:did/cards/:cid', () => {
    it('returns CardDataDTO for a scalar dashcard', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
        const reqUrl = String(input);
        if (reqUrl.includes('/query')) {
          return { ok: true, json: async () => mockCardQueryResult } as Response;
        }
        return {
          ok: true,
          json: async () => mockMetabaseDashboard
        } as Response;
      });

      const response = await request(url)
        .get('/api/dashboards/13-analyses/cards/929')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as CardDataDTO;
      expect(body.id).toBe(929);
      expect(body.data).toBe(51884);
    });

    it('returns 404 when dashcard not found', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockMetabaseDashboard
      } as Response);

      const response = await request(url)
        .get('/api/dashboards/13-analyses/cards/9999')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('returns 422 for non-integer cid', async () => {
      const response = await request(url)
        .get('/api/dashboards/13-analyses/cards/not-a-number')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn nx test server -- src/controllers/test/dashboard-api.test.ts
```

Expected: FAIL — `findOneCard` does not exist, route does not exist.

- [ ] **Step 3: Update dashboardController.ts**

```typescript
// server/src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { param, ValidationChain } from 'express-validator';
import { constants } from 'node:http2';
import jwt from 'jsonwebtoken';

import type { CardDataDTO, DashboardDTO, Resource } from '@zerologementvacant/models';
import { RESOURCE_VALUES } from '@zerologementvacant/models';
import DashcardMissingError from '~/errors/dashcardMissingError';
import config from '~/infra/config';
import {
  createURL,
  fetchCardQueryData,
  fetchMetabaseDashboard,
  findDashcard,
  getResource,
  normalizeDashboard
} from '~/models/DashboardApi';

async function findOne(
  request: Request<{ id: Resource }>,
  response: Response<DashboardDTO>
): Promise<void> {
  const { auth, params } = request as AuthenticatedRequest<{ id: Resource }>;

  const numericId = getResource(params.id);

  const [token, raw] = await Promise.all([
    sign({
      resource: { dashboard: numericId },
      params: { id: auth.establishmentId }
    }),
    fetchMetabaseDashboard(
      numericId,
      config.metabase.domain,
      config.metabase.apiToken
    )
  ]);

  const url = createURL({ domain: config.metabase.domain, token });
  const normalized = normalizeDashboard(raw);

  response
    .status(constants.HTTP_STATUS_OK)
    .json({ id: numericId, url, ...normalized });
}

async function findOneCard(
  request: Request<{ did: string; cid: string }>,
  response: Response<CardDataDTO>
): Promise<void> {
  const { params } = request as AuthenticatedRequest<{
    did: string;
    cid: string;
  }>;

  const numericDid = RESOURCE_VALUES.includes(params.did as Resource)
    ? getResource(params.did as Resource)
    : parseInt(params.did, 10);
  const numericCid = parseInt(params.cid, 10);

  const raw = await fetchMetabaseDashboard(
    numericDid,
    config.metabase.domain,
    config.metabase.apiToken
  );

  const dashcard = findDashcard(raw, numericCid);
  if (!dashcard) throw new DashcardMissingError(numericCid);

  const data = await fetchCardQueryData({
    dashboardId: numericDid,
    dashcardId: dashcard.dashcardId,
    cardId: dashcard.cardId,
    domain: config.metabase.domain,
    apiToken: config.metabase.apiToken
  });

  response.status(constants.HTTP_STATUS_OK).json({ id: numericCid, data });
}

const findOneValidators: ValidationChain[] = [
  param('id').isIn(RESOURCE_VALUES)
];

function sign(payload: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      config.metabase.token,
      { algorithm: 'HS256', expiresIn: '10m' },
      (err, token) => {
        if (err) return reject(err);
        return resolve(token ?? '');
      }
    );
  });
}

export default { findOne, findOneCard, findOneValidators };
```

- [ ] **Step 4: Add route to protected.ts** — locate the existing dashboard route (~line 490) and add the card route immediately after it:

```typescript
// In protected.ts — add after the existing /dashboards/:id GET route:
router.get(
  '/dashboards/:did/cards/:cid',
  validatorNext.validate({
    params: object({
      did: mixed().required(),
      cid: number().integer().positive().required()
    })
  }),
  dashboardController.findOneCard
);
```

Also add `mixed` and `number` to the existing yup import line at the top of `protected.ts`. The existing line imports `object` and `string` — add to it:

```typescript
import { mixed, number, object, string } from 'yup';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
yarn nx test server -- src/controllers/test/dashboard-api.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/dashboardController.ts \
        server/src/controllers/test/dashboard-api.test.ts \
        server/src/routers/protected.ts
git commit -m "feat(server): update dashboard endpoint and add card data endpoint"
```

---

## Task 5: Frontend MSW handlers + RTK Query service

**Files:**
- Create: `frontend/src/mocks/handlers/dashboard-handlers.ts`
- Modify: `frontend/src/mocks/handlers/index.ts`
- Modify: `frontend/src/services/dashboard.service.ts`

- [ ] **Step 1: Create dashboard-handlers.ts**

```typescript
// frontend/src/mocks/handlers/dashboard-handlers.ts
import { http, HttpResponse, RequestHandler } from 'msw';

import type { CardDataDTO, DashboardDTO } from '@zerologementvacant/models';
import {
  genCardDataDTO,
  genDashboardDTO
} from '@zerologementvacant/models/fixtures';
import config from '../../utils/config';

const findOne = http.get<{ id: string }, never, DashboardDTO>(
  `${config.apiEndpoint}/dashboards/:id`,
  () => HttpResponse.json(genDashboardDTO())
);

const findOneCard = http.get<{ did: string; cid: string }, never, CardDataDTO>(
  `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
  ({ params }) =>
    HttpResponse.json(genCardDataDTO({ id: Number(params.cid) }))
);

export const dashboardHandlers: RequestHandler[] = [findOne, findOneCard];
```

- [ ] **Step 2: Register handlers in index.ts** — add the import and spread:

```typescript
// Add import alongside existing imports:
import { dashboardHandlers } from './dashboard-handlers';

// Add to the handlers array (before otherHandlers):
...dashboardHandlers,
```

- [ ] **Step 3: Update dashboard.service.ts** — keep `findOneDashboard` code-untouched, add `findOneDashboardNext` and `findOneCard`:

```typescript
// frontend/src/services/dashboard.service.ts
import type {
  CardDataDTO,
  DashboardDTO,
  Resource
} from '@zerologementvacant/models';
import { zlvApi } from './api.service';

interface FindOneOptions {
  id: Resource;
}

interface FindOneCardOptions {
  did: Resource | number;
  cid: number;
}

export const dashboardApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOneDashboard: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      providesTags: (_result, _error, arg) => [{ type: 'Stats', id: arg.id }]
    }),
    findOneDashboardNext: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      providesTags: (_result, _error, arg) => [
        { type: 'Stats', id: `next-${arg.id}` }
      ]
    }),
    findOneCard: builder.query<CardDataDTO, FindOneCardOptions>({
      query: (opts) => `dashboards/${opts.did}/cards/${opts.cid}`,
      providesTags: (_result, _error, arg) => [
        { type: 'Stats', id: `${arg.did}-card-${arg.cid}` }
      ]
    })
  })
});

export const {
  useFindOneDashboardQuery,
  useFindOneDashboardNextQuery,
  useFindOneCardQuery
} = dashboardApi;
```

- [ ] **Step 4: Run typecheck**

```bash
yarn nx typecheck frontend
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/mocks/handlers/dashboard-handlers.ts \
        frontend/src/mocks/handlers/index.ts \
        frontend/src/services/dashboard.service.ts
git commit -m "feat(frontend): add dashboard MSW handlers and findOneCard RTK endpoint"
```

---

## Task 6: Feature flag + routing

**Files:**
- Modify: `frontend/src/layouts/FeatureFlagLayout.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add flag to FeatureFlagLayout.tsx** — change line 6:

```typescript
// Before:
type AvailableFeatureFlag = never;

// After:
type AvailableFeatureFlag = 'new-analysis-page';
```

- [ ] **Step 2: Update analysis routes in App.tsx** — add lazy import after the existing `AnalysisView` import line:

```typescript
const AnalysisViewNext = lazy(() => import('~/views/Analysis/AnalysisViewNext'));
```

Add `FeatureFlagLayout` import alongside other layout imports:

```typescript
import FeatureFlagLayout from '~/layouts/FeatureFlagLayout';
```

Replace the two existing analysis routes with wrapped versions:

```tsx
// Before:
<Route
  path="/analyses/parc-vacant"
  element={<AnalysisView id="13-analyses" />}
/>
<Route
  path="/analyses/lutte"
  element={<AnalysisView id="15-analyses-activites" />}
/>

// After:
<Route
  path="/analyses/parc-vacant"
  element={
    <FeatureFlagLayout
      flag="new-analysis-page"
      then={<AnalysisViewNext id="13-analyses" />}
      else={<AnalysisView id="13-analyses" />}
    />
  }
/>
<Route
  path="/analyses/lutte"
  element={
    <FeatureFlagLayout
      flag="new-analysis-page"
      then={<AnalysisViewNext id="15-analyses-activites" />}
      else={<AnalysisView id="15-analyses-activites" />}
    />
  }
/>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/layouts/FeatureFlagLayout.tsx frontend/src/App.tsx
git commit -m "feat(frontend): register new-analysis-page flag and wrap analysis routes"
```

---

## Task 7: AnalysisCard component (TDD)

**Files:**
- Create: `frontend/src/components/Analysis/test/AnalysisCard.test.tsx`
- Create: `frontend/src/components/Analysis/AnalysisCard.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/src/components/Analysis/test/AnalysisCard.test.tsx
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import {
  genCardDataDTO,
  genFlatNumberCard
} from '@zerologementvacant/models/fixtures';
import { server } from '~/mocks/server';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';
import AnalysisCard from '../AnalysisCard';

function setup(props: React.ComponentProps<typeof AnalysisCard>) {
  render(
    <Provider store={configureTestStore()}>
      <AnalysisCard {...props} />
    </Provider>
  );
}

describe('AnalysisCard', () => {
  const card = genFlatNumberCard({ id: 929, title: 'Logements vacants', decimals: 0 });
  const dashboardId = '13-analyses' as const;

  it('shows a skeleton while loading', () => {
    server.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        async () => new Promise(() => {})
      )
    );

    setup({ card, dashboardId });

    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    server.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json({ message: 'Error' }, { status: 500 })
      )
    );

    setup({ card, dashboardId });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('displays a flat number value', async () => {
    server.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(genCardDataDTO({ id: 929, data: 51884 }))
      )
    );

    setup({ card, dashboardId });

    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
    // fr-FR formats 51884 as "51 884" with narrow no-break space (U+202F)
    expect(await screen.findByText(/51[\s ]884/)).toBeInTheDocument();
  });

  it('displays a percentage value', async () => {
    const percentCard = genFlatNumberCard({
      id: 929,
      type: 'percentage',
      decimals: 1
    });
    server.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(genCardDataDTO({ id: 929, data: 0.4823 }))
      )
    );

    setup({ card: percentCard, dashboardId });

    // Intl.NumberFormat 'percent' multiplies by 100: 0.4823 → 48.2 %
    expect(await screen.findByText(/48[,.]2/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn nx test frontend -- src/components/Analysis/test/AnalysisCard.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement AnalysisCard.tsx**

```typescript
// frontend/src/components/Analysis/AnalysisCard.tsx
import Alert from '@codegouvfr/react-dsfr/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

import type { DashboardCard, Resource } from '@zerologementvacant/models';
import { useFindOneCardQuery } from '~/services/dashboard.service';

interface Props {
  card: DashboardCard;
  dashboardId: Resource | number;
}

const CardBox = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem'
});

function formatValue(data: number, card: DashboardCard): string {
  if (card.type === 'percentage') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      maximumFractionDigits: card.decimals
    }).format(data);
  }
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: card.decimals
  }).format(data);
}

function AnalysisCard({ card, dashboardId }: Readonly<Props>) {
  const { data, isLoading, isError } = useFindOneCardQuery({
    did: dashboardId,
    cid: card.id
  });

  if (isLoading) {
    return (
      <Skeleton
        data-testid="card-skeleton"
        variant="rectangular"
        width="100%"
        height="100%"
      />
    );
  }

  if (isError || !data) {
    return (
      <Alert
        severity="error"
        small
        title="Impossible de charger ce graphique"
      />
    );
  }

  return (
    <CardBox>
      <Typography variant="h6">{card.title}</Typography>
      <Typography variant="h3">{formatValue(data.data, card)}</Typography>
      {card.description !== null && (
        <Typography variant="body2">{card.description}</Typography>
      )}
    </CardBox>
  );
}

export default AnalysisCard;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn nx test frontend -- src/components/Analysis/test/AnalysisCard.test.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Analysis/AnalysisCard.tsx \
        frontend/src/components/Analysis/test/AnalysisCard.test.tsx
git commit -m "feat(frontend): add AnalysisCard component with loading, error and data states"
```

---

## Task 8: AnalysisViewNext (TDD)

**Files:**
- Create: `frontend/src/views/Analysis/test/AnalysisViewNext.test.tsx`
- Create: `frontend/src/views/Analysis/AnalysisViewNext.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/src/views/Analysis/test/AnalysisViewNext.test.tsx
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import type { DashboardDTO } from '@zerologementvacant/models';
import {
  genCardDataDTO,
  genDashboardDTO,
  genFlatNumberCard
} from '@zerologementvacant/models/fixtures';
import { server } from '~/mocks/server';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';
import AnalysisViewNext from '../AnalysisViewNext';

function setup(dashboardHandler: Parameters<typeof http.get>[1]) {
  server.use(
    http.get(`${config.apiEndpoint}/dashboards/:id`, dashboardHandler),
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      ({ params }) =>
        HttpResponse.json(genCardDataDTO({ id: Number(params.cid), data: 12345 }))
    )
  );

  const router = createMemoryRouter(
    [
      {
        path: '/analyses/parc-vacant',
        element: <AnalysisViewNext id="13-analyses" />
      }
    ],
    { initialEntries: ['/analyses/parc-vacant'] }
  );

  render(
    <Provider store={configureTestStore()}>
      <RouterProvider router={router} />
    </Provider>
  );
}

describe('AnalysisViewNext', () => {
  it('shows a skeleton while the dashboard is loading', () => {
    setup(async () => new Promise(() => {}));

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  it('shows an error when the dashboard request fails', async () => {
    setup(() => HttpResponse.json({ message: 'Error' }, { status: 500 }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders cards directly when dashboard has no tabs', async () => {
    const card = genFlatNumberCard({ id: 929, title: 'Logements vacants' });
    const dashboard = genDashboardDTO({ cards: [card] });

    setup(() => HttpResponse.json(dashboard));

    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
  });

  it('renders tab labels when dashboard has tabs', async () => {
    const card = genFlatNumberCard({ id: 929, title: 'Logements vacants' });
    const dashboard: DashboardDTO = {
      id: 13,
      url: 'https://stats.zlv.beta.gouv.fr/embed/dashboard/fake',
      tabs: [{ id: 1, title: 'Parc vacant', cards: [card] }]
    };

    setup(() => HttpResponse.json(dashboard));

    expect(await screen.findByText('Parc vacant')).toBeInTheDocument();
    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn nx test frontend -- src/views/Analysis/test/AnalysisViewNext.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement AnalysisViewNext.tsx**

```typescript
// frontend/src/views/Analysis/AnalysisViewNext.tsx
import Alert from '@codegouvfr/react-dsfr/Alert';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';

import type { DashboardCard, Resource } from '@zerologementvacant/models';
import AnalysisCard from '~/components/Analysis/AnalysisCard';
import MainContainer from '~/components/MainContainer/MainContainer';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFindOneDashboardNextQuery } from '~/services/dashboard.service';

interface Props {
  id: Resource;
}

const CardGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(24, 1fr)',
  gap: '1rem'
});

interface CardCellProps {
  col: number;
  row: number;
  width: number;
  height: number;
}

const CardCell = styled(Box, {
  shouldForwardProp: (prop) =>
    !['col', 'row', 'width', 'height'].includes(prop as string)
})<CardCellProps>(({ col, row, width, height }) => ({
  gridColumn: `${col + 1} / span ${width}`,
  gridRow: `${row + 1} / span ${height}`
}));

interface CardGridContentProps {
  cards: ReadonlyArray<DashboardCard>;
  dashboardId: Resource | number;
}

function CardGridContent({
  cards,
  dashboardId
}: Readonly<CardGridContentProps>) {
  return (
    <CardGrid>
      {cards.map((card) => (
        <CardCell
          key={card.id}
          col={card.position.col}
          row={card.position.row}
          width={card.size.width}
          height={card.size.height}
        >
          <AnalysisCard card={card} dashboardId={dashboardId} />
        </CardCell>
      ))}
    </CardGrid>
  );
}

function AnalysisViewNext({ id }: Readonly<Props>) {
  useDocumentTitle('Analyse');
  const {
    data: dashboard,
    isLoading,
    isError
  } = useFindOneDashboardNextQuery({ id });

  return (
    <MainContainer>
      {isLoading && (
        <Skeleton
          data-testid="dashboard-skeleton"
          variant="rectangular"
          width="100%"
          height="20rem"
        />
      )}
      {isError && (
        <Alert
          severity="error"
          title="Impossible de charger le tableau de bord"
        />
      )}
      {dashboard && (
        'tabs' in dashboard ? (
          <Tabs
            tabs={dashboard.tabs.map((tab) => ({
              label: tab.title,
              content: (
                <CardGridContent
                  cards={tab.cards}
                  dashboardId={dashboard.id}
                />
              )
            }))}
          />
        ) : (
          <CardGridContent
            cards={dashboard.cards}
            dashboardId={dashboard.id}
          />
        )
      )}
    </MainContainer>
  );
}

export default AnalysisViewNext;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn nx test frontend -- src/views/Analysis/test/AnalysisViewNext.test.tsx
```

Expected: both tests pass.

- [ ] **Step 5: Run full test suite**

```bash
yarn nx run-many -t test --projects=@zerologementvacant/models,server,@zerologementvacant/front
```

Expected: all tests pass across all three projects.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/Analysis/AnalysisViewNext.tsx \
        frontend/src/views/Analysis/test/AnalysisViewNext.test.tsx
git commit -m "feat(frontend): add AnalysisViewNext with tab and card grid rendering"
```
