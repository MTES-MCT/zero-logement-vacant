# Metabase Bar Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bar chart support to the Analysis page, including backend Metabase detection, a DSFR `BarChart` renderer, and an accessible transcription accordion for both bar and pie charts.

**Architecture:** Extend the existing discriminated-union pattern (`CardType` / `CardDataDTO`) with a `'bar-chart'` variant. The backend detects `display: 'bar'` (vertical) and `display: 'row'` (horizontal) from Metabase and resolves `direction` before returning `BarChartDataDTO`. The frontend renders a DSFR `BarChart` and a new shared `ChartTranscription` accordion (auto-generated from `labels` + `data`) used by both chart types.

**Tech Stack:** TypeScript, React, `@codegouvfr/react-dsfr/Chart/BarChart`, `@codegouvfr/react-dsfr/Accordion`, `effect` (Array/pipe), `ts-pattern`, Vitest, MSW, nock, supertest

---

## File Map

| File | Change |
|------|--------|
| `packages/models/src/DashboardDTO.ts` | Add `BarChartCard`, `BarChartDataDTO`, extend unions |
| `packages/models/src/test/fixtures.ts` | Add `genBarChartCard()`, `genBarChartDataDTO()` |
| `server/src/services/metabase/metabase-service.ts` | Add `BarChartValue`, extend `DashcardRef`, extend `CardValue` |
| `server/src/services/metabase/metabase-api.ts` | Detect `bar`/`row`, resolve `direction`, handle bar chart in `getCardValue` |
| `server/src/controllers/dashboardController.ts` | Pass `direction`, handle `BarChartDataDTO` response |
| `server/src/controllers/test/dashboard-api.test.ts` | Add bar chart API tests |
| `frontend/src/components/Analysis/AnalysisCard.tsx` | Add `ChartTranscription`, `BarChartDisplay`, update dispatch |
| `frontend/src/components/Analysis/test/AnalysisCard.test.tsx` | Add bar chart + transcription tests |

---

## Task 1: Extend data model types

**Files:**
- Modify: `packages/models/src/DashboardDTO.ts`

- [ ] **Step 1: Add `BarChartCard`, `BarChartDataDTO`, extend the unions**

Replace the contents of `packages/models/src/DashboardDTO.ts` with:

```typescript
// packages/models/src/DashboardDTO.ts

export type CardType = 'flat-number' | 'percentage' | 'pie-chart' | 'bar-chart';

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

export interface PieChartCard extends CardCommon {
  type: 'pie-chart';
}

export interface BarChartCard extends CardCommon {
  type: 'bar-chart';
}

export type DashboardCard =
  | FlatNumberCard
  | PercentageCard
  | PieChartCard
  | BarChartCard;

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

export type DashboardDTO = { id: number; url: string } & (WithTabs | WithoutTabs);

export interface ScalarCardDataDTO {
  id: number;
  type: 'flat-number' | 'percentage';
  data: number;
}

export interface PieChartDataDTO {
  id: number;
  type: 'pie-chart';
  data: number[];
  labels: string[];
}

export interface BarChartDataDTO {
  id: number;
  type: 'bar-chart';
  direction: 'horizontal' | 'vertical';
  labels: string[];
  data: number[];
}

export type CardDataDTO = ScalarCardDataDTO | PieChartDataDTO | BarChartDataDTO;

export const RESOURCE_VALUES = [
  '6-utilisateurs-de-zlv-sur-votre-structure',
  '7-autres-structures-de-votre-territoires-inscrites-sur-zlv',
  '13-analyses',
  '15-analyses-activites'
] as const;

export type Resource = (typeof RESOURCE_VALUES)[number];
```

- [ ] **Step 2: Run typecheck to verify no breakage**

```bash
yarn nx run-many -t typecheck --exclude=zero-logement-vacant
```

Expected: all workspaces pass.

- [ ] **Step 3: Commit**

```bash
git add packages/models/src/DashboardDTO.ts
git commit -m "feat(models): add BarChartCard and BarChartDataDTO types"
```

---

## Task 2: Add fixtures

**Files:**
- Modify: `packages/models/src/test/fixtures.ts`

- [ ] **Step 1: Add `genBarChartCard` and `genBarChartDataDTO` after `genPieChartCard`**

In `packages/models/src/test/fixtures.ts`, locate `genPieChartCard` (around line 998) and add the two new functions immediately after `genPieChartCard`:

```typescript
export function genBarChartCard(
  override?: Partial<BarChartCard>
): BarChartCard {
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    type: 'bar-chart',
    title: faker.lorem.words(3),
    description: null,
    decimals: 0,
    position: { col: 0, row: 0 },
    size: { width: 6, height: 4 },
    ...override
  };
}

export function genBarChartDataDTO(
  override?: Partial<BarChartDataDTO>
): BarChartDataDTO {
  const series = faker.number.int({ min: 2, max: 5 });
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = 0; i < series; i++) {
    labels.push(faker.word.noun());
    data.push(faker.number.int({ min: 1, max: 10000 }));
  }
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    type: 'bar-chart',
    direction: faker.helpers.arrayElement(['horizontal', 'vertical'] as const),
    labels,
    data,
    ...override
  };
}
```

Make sure `BarChartCard` and `BarChartDataDTO` are imported at the top of the file alongside the other types from `../DashboardDTO`.

- [ ] **Step 2: Run typecheck**

```bash
yarn nx run-many -t typecheck --exclude=zero-logement-vacant
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/models/src/test/fixtures.ts
git commit -m "feat(models): add genBarChartCard and genBarChartDataDTO fixtures"
```

---

## Task 3: Backend failing tests

**Files:**
- Modify: `server/src/controllers/test/dashboard-api.test.ts`

- [ ] **Step 1: Add mock Metabase dashboard and query-result data at the top of the test file**

After `mockPieCardQueryResult` (around line 186), add:

```typescript
const mockMetabaseDashboardWithBarCard = {
  id: 13,
  dashcards: [
    {
      id: 960,
      card_id: 810,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: { 'card.title': 'Répartition par date de construction' },
      card: {
        id: 810,
        name: 'Répartition par date de construction',
        display: 'bar',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockMetabaseDashboardWithRowCard = {
  id: 13,
  dashcards: [
    {
      id: 961,
      card_id: 811,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: { 'card.title': 'Répartition horizontale' },
      card: {
        id: 811,
        name: 'Répartition horizontale',
        display: 'row',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockBarCardQueryResult = {
  data: {
    rows: [
      ['1991 et apres', 3200],
      ['1946 - 1990', 1800]
    ],
    cols: [{ name: 'period' }, { name: 'count' }]
  },
  status: 'completed'
};
```

- [ ] **Step 2: Add failing tests in the `GET /dashboards/:id` block**

In the `describe('GET /dashboards/:id')` block, after the pie-chart test, add:

```typescript
it('returns a bar-chart card when display is "bar"', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithBarCard);

  const response = await request(url)
    .get('/dashboards/13-analyses')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  const body = response.body as DashboardDTO;
  expect('cards' in body).toBe(true);
  if ('cards' in body) {
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0]).toMatchObject({
      id: 960,
      type: 'bar-chart',
      title: 'Répartition par date de construction'
    });
  }
});

it('returns a bar-chart card when display is "row"', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithRowCard);

  const response = await request(url)
    .get('/dashboards/13-analyses')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  const body = response.body as DashboardDTO;
  expect('cards' in body).toBe(true);
  if ('cards' in body) {
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0]).toMatchObject({
      id: 961,
      type: 'bar-chart',
      title: 'Répartition horizontale'
    });
  }
});
```

- [ ] **Step 3: Add failing tests in the `GET /dashboards/:did/cards/:cid` block**

After the pie-chart card test, add:

```typescript
it('returns BarChartDataDTO with direction "vertical" for display "bar"', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithBarCard);
  nock(METABASE_URL)
    .post('/api/dashboard/13/dashcard/960/card/810/query')
    .reply(200, mockBarCardQueryResult);

  const response = await request(url)
    .get('/dashboards/13-analyses/cards/960')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  expect(response.body).toMatchObject({
    id: 960,
    type: 'bar-chart',
    direction: 'vertical',
    labels: ['1991 et apres', '1946 - 1990'],
    data: [3200, 1800]
  });
});

it('returns BarChartDataDTO with direction "horizontal" for display "row"', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithRowCard);
  nock(METABASE_URL)
    .post('/api/dashboard/13/dashcard/961/card/811/query')
    .reply(200, mockBarCardQueryResult);

  const response = await request(url)
    .get('/dashboards/13-analyses/cards/961')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  expect(response.body).toMatchObject({
    id: 961,
    type: 'bar-chart',
    direction: 'horizontal',
    labels: ['1991 et apres', '1946 - 1990'],
    data: [3200, 1800]
  });
});
```

- [ ] **Step 4: Run tests and confirm they fail**

```bash
yarn nx test server -- dashboard-api
```

Expected: 4 new tests fail with errors like `"expected 'flat-number' to equal 'bar-chart'"` or similar type errors.

---

## Task 4: Extend MetabaseService types

**Files:**
- Modify: `server/src/services/metabase/metabase-service.ts`

- [ ] **Step 1: Add `BarChartValue`, extend `DashcardRef` and `CardValue`**

Replace the entire file content:

```typescript
import type { CardType, DashboardCard, Tab } from '@zerologementvacant/models';

export type DashboardData =
  | { tabs: ReadonlyArray<Tab> }
  | { cards: ReadonlyArray<DashboardCard> };

export interface DashboardParameter {
  id: string;
  slug: string;
  type: string;
}

export interface DashcardRef {
  dashcardId: number;
  cardId: number;
  type: CardType;
  valueColumn: string | null;
  direction: 'horizontal' | 'vertical' | null;
  dashboardParameters: ReadonlyArray<DashboardParameter>;
}

export type PieChartValue = { labels: string[]; data: number[] };
export type BarChartValue = {
  direction: 'horizontal' | 'vertical';
  labels: string[];
  data: number[];
};
export type CardValue = number | PieChartValue | BarChartValue;

export interface MetabaseService {
  getDashboard(id: number): Promise<DashboardData>;
  findDashcard(dashboardId: number, dashcardId: number): Promise<DashcardRef | null>;
  getCardValue(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    parameters: ReadonlyArray<DashboardParameter & { value: string }>,
    valueColumn: string | null,
    cardType: CardType,
    direction: 'horizontal' | 'vertical' | null
  ): Promise<CardValue>;
}
```

- [ ] **Step 2: Run typecheck — expect errors in `metabase-api.ts` (not yet updated)**

```bash
yarn nx typecheck server
```

Expected: TypeScript errors in `metabase-api.ts` — this is fine, the next task fixes them.

---

## Task 5: Implement bar chart detection in `metabase-api.ts`

**Files:**
- Modify: `server/src/services/metabase/metabase-api.ts`

- [ ] **Step 1: Add `BarChartValue` import**

At the top of the file, update the import from `./metabase-service`:

```typescript
import type {
  BarChartValue,
  CardValue,
  DashboardData,
  DashboardParameter,
  DashcardRef,
  MetabaseService,
  PieChartValue
} from './metabase-service';
```

- [ ] **Step 2: Detect bar and row display types in `normalizeDashcard`**

In `normalizeDashcard`, add the bar chart branch immediately after the pie chart branch (before the `if (card.display !== 'scalar') return null;` line):

```typescript
if (card.display === 'bar' || card.display === 'row') {
  return {
    id: dashcard.id,
    type: 'bar-chart',
    title: dashcard.visualization_settings['card.title'] ?? card.name,
    description: card.description,
    decimals: 0,
    position: { col: dashcard.col, row: dashcard.row },
    size: { width: dashcard.size_x, height: dashcard.size_y }
  };
}
```

- [ ] **Step 3: Add `direction: null` to the existing pie-chart and scalar branches in `findDashcardRef`**

In `findDashcardRef`, update the pie-chart branch to include `direction: null`:

```typescript
if (normalized.type === 'pie-chart') {
  return {
    dashcardId: found.id,
    cardId: found.card_id,
    type: 'pie-chart',
    valueColumn: null,
    direction: null,
    dashboardParameters: (raw.parameters ?? []).map(
      (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
    )
  };
}
```

Update the scalar return at the end of `findDashcardRef` to include `direction: null`:

```typescript
return {
  dashcardId: found.id,
  cardId: found.card_id,
  type: normalized.type,
  valueColumn: settings['scalar.field'] ?? null,
  direction: null,
  dashboardParameters: (raw.parameters ?? []).map(
    (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
  )
};
```

- [ ] **Step 4: Add the bar-chart branch in `findDashcardRef`**

In `findDashcardRef`, add the bar-chart branch after the pie-chart branch:

```typescript
if (normalized.type === 'bar-chart') {
  return {
    dashcardId: found.id,
    cardId: found.card_id,
    type: 'bar-chart',
    valueColumn: null,
    direction: found.card!.display === 'bar' ? 'vertical' : 'horizontal',
    dashboardParameters: (raw.parameters ?? []).map(
      (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
    )
  };
}
```

- [ ] **Step 5: Update `getCardValue` signature to accept `direction`**

In the `MetabaseAPI` class, update the `getCardValue` method signature:

```typescript
async getCardValue(
  dashboardId: number,
  dashcardId: number,
  cardId: number,
  parameters: ReadonlyArray<DashboardParameter & { value: string }>,
  valueColumn: string | null,
  cardType: CardType,
  direction: 'horizontal' | 'vertical' | null
): Promise<CardValue> {
```

- [ ] **Step 6: Add the bar-chart branch in `getCardValue`**

In `getCardValue`, add the bar-chart branch immediately after the pie-chart branch:

```typescript
if (cardType === 'bar-chart') {
  const result: BarChartValue = {
    direction: direction!,
    labels: data.data.rows.map((row) => String(row[0])),
    data: data.data.rows.map((row) => Number(row[1]))
  };
  return result;
}
```

- [ ] **Step 7: Run typecheck**

```bash
yarn nx typecheck server
```

Expected: only the controller has remaining errors (not yet updated).

---

## Task 6: Update the dashboard controller

**Files:**
- Modify: `server/src/controllers/dashboardController.ts`

- [ ] **Step 1: Import `BarChartValue` and `PieChartValue`**

Update the import from `~/services/metabase/metabase-api`:

```typescript
import type { BarChartValue, PieChartValue } from '~/services/metabase/metabase-service';
```

Add this alongside the existing imports at the top of the file.

- [ ] **Step 2: Pass `dashcard.direction` to `getCardValue` and handle the bar-chart response**

Replace the `findOneCard` function body from the `getCardValue` call through the response section:

```typescript
const raw = await metabaseAPI.getCardValue(
  numericDid,
  dashcard.dashcardId,
  dashcard.cardId,
  queryParameters,
  dashcard.valueColumn,
  dashcard.type,
  dashcard.direction
);

if (dashcard.type === 'bar-chart' && typeof raw === 'object' && raw !== null) {
  const barRaw = raw as BarChartValue;
  response.status(constants.HTTP_STATUS_OK).json({
    id: numericCid,
    type: 'bar-chart',
    direction: barRaw.direction,
    labels: barRaw.labels,
    data: barRaw.data
  });
  return;
}

if (typeof raw === 'object' && raw !== null) {
  const pieRaw = raw as PieChartValue;
  response.status(constants.HTTP_STATUS_OK).json({
    id: numericCid,
    type: 'pie-chart',
    labels: pieRaw.labels,
    data: pieRaw.data
  });
  return;
}

const data = dashcard.type === 'percentage' ? raw / 100 : raw;
response.status(constants.HTTP_STATUS_OK).json({
  id: numericCid,
  type: dashcard.type as 'flat-number' | 'percentage',
  data
});
```

- [ ] **Step 3: Run typecheck**

```bash
yarn nx typecheck server
```

Expected: no errors.

- [ ] **Step 4: Run backend tests**

```bash
yarn nx test server -- dashboard-api
```

Expected: all tests pass including the 4 new bar-chart tests.

- [ ] **Step 5: Commit**

```bash
git add \
  server/src/services/metabase/metabase-service.ts \
  server/src/services/metabase/metabase-api.ts \
  server/src/controllers/dashboardController.ts \
  server/src/controllers/test/dashboard-api.test.ts
git commit -m "feat(server): detect and map Metabase bar charts"
```

---

## Task 7: Frontend failing tests

**Files:**
- Modify: `frontend/src/components/Analysis/test/AnalysisCard.test.tsx`

- [ ] **Step 1: Add imports for bar chart fixtures**

Update the import from `@zerologementvacant/models/fixtures`:

```typescript
import {
  genBarChartCard,
  genBarChartDataDTO,
  genFlatNumberCard,
  genPercentageCard,
  genPieChartCard,
  genPieChartDataDTO,
  genScalarCardDataDTO
} from '@zerologementvacant/models/fixtures';
```

- [ ] **Step 2: Add failing bar chart rendering test**

Add at the end of the `describe('AnalysisCard')` block:

```typescript
it('renders a bar chart card without error when card type is bar-chart', async () => {
  const barCard = genBarChartCard({ id: 80, title: 'Répartition par date de construction' });
  const cardData = genBarChartDataDTO({
    id: 80,
    direction: 'vertical',
    labels: ['1991 et apres', '1946 - 1990'],
    data: [3200, 1800]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: barCard, dashboardId });

  await screen.findByText('Répartition par date de construction');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Add failing transcription tests for pie chart**

```typescript
it('shows a transcription accordion for a pie chart', async () => {
  const pieCard = genPieChartCard({ id: 77, title: 'Répartition par type' });
  const cardData = genPieChartDataDTO({
    id: 77,
    labels: ['APPART', 'MAISON'],
    data: [4876, 652]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: pieCard, dashboardId });

  await screen.findByText('Répartition par type');
  expect(screen.getByRole('button', { name: /Transcription/i })).toBeInTheDocument();
});

it('shows percentage transcription items for a pie chart', async () => {
  const pieCard = genPieChartCard({ id: 77, title: 'Répartition par type' });
  // 4876 / (4876 + 652) * 100 = 88.2 → 88%
  // 652  / (4876 + 652) * 100 = 11.8 → 12%
  const cardData = genPieChartDataDTO({
    id: 77,
    labels: ['APPART', 'MAISON'],
    data: [4876, 652]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: pieCard, dashboardId });

  await screen.findByText('Répartition par type');
  expect(screen.getByText('APPART : 88 %')).toBeInTheDocument();
  expect(screen.getByText('MAISON : 12 %')).toBeInTheDocument();
});
```

- [ ] **Step 4: Add failing transcription tests for bar chart**

```typescript
it('shows a transcription accordion for a bar chart', async () => {
  const barCard = genBarChartCard({ id: 80, title: 'Répartition par date de construction' });
  const cardData = genBarChartDataDTO({
    id: 80,
    direction: 'vertical',
    labels: ['1991 et apres', '1946 - 1990'],
    data: [3200, 1800]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: barCard, dashboardId });

  await screen.findByText('Répartition par date de construction');
  expect(screen.getByRole('button', { name: /Transcription/i })).toBeInTheDocument();
});

it('shows raw value transcription items for a bar chart', async () => {
  const barCard = genBarChartCard({ id: 80, title: 'Répartition par date de construction' });
  const cardData = genBarChartDataDTO({
    id: 80,
    direction: 'vertical',
    labels: ['1991 et apres', '1946 - 1990'],
    data: [3200, 1800]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: barCard, dashboardId });

  await screen.findByText('Répartition par date de construction');
  expect(screen.getByText('1991 et apres : 3200')).toBeInTheDocument();
  expect(screen.getByText('1946 - 1990 : 1800')).toBeInTheDocument();
});
```

- [ ] **Step 5: Run tests and confirm they fail**

```bash
yarn nx test frontend -- AnalysisCard
```

Expected: 6 new tests fail (no `BarChart` component, no transcription accordion).

---

## Task 8: Implement `ChartTranscription`, `BarChartDisplay`, and update dispatch

**Files:**
- Modify: `frontend/src/components/Analysis/AnalysisCard.tsx`

- [ ] **Step 1: Add new imports**

At the top of `AnalysisCard.tsx`, add:

```typescript
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import { BarChart } from '@codegouvfr/react-dsfr/Chart/BarChart';
import { Array, pipe } from 'effect';
import { match } from 'ts-pattern';
```

And extend the models import to include `BarChartDataDTO`:

```typescript
import type {
  BarChartDataDTO,
  DashboardCard,
  PieChartDataDTO,
  Resource
} from '@zerologementvacant/models';
```

- [ ] **Step 2: Add `ChartTranscription` component**

Add this component after the `formatValue` function:

```typescript
interface ChartTranscriptionProps {
  title: string;
  labels: string[];
  data: number[];
  type: 'pie-chart' | 'bar-chart';
}

function ChartTranscription({
  title,
  labels,
  data,
  type
}: Readonly<ChartTranscriptionProps>) {
  const items = match(type)
    .with('pie-chart', () => {
      const total = pipe(
        data,
        Array.reduce(0, (acc, v) => acc + v)
      );
      return pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${Math.round((value / total) * 100)} %`)
      );
    })
    .with('bar-chart', () =>
      pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${value}`)
      )
    )
    .exhaustive();

  return (
    <Accordion label="Transcription">
      <p>{title}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Accordion>
  );
}
```

- [ ] **Step 3: Update `PieChartDisplay` to include the transcription**

Replace the existing `PieChartDisplay`:

```typescript
interface PieChartDisplayProps {
  card: DashboardCard;
  cardData: PieChartDataDTO;
}

function PieChartDisplay({ card, cardData }: Readonly<PieChartDisplayProps>) {
  return (
    <>
      <PieChart
        x={cardData.labels}
        y={cardData.data}
        name={cardData.labels}
        color={[
          'blue-france',
          'blue-cumulus',
          'blue-ecume',
          'green-archipel',
          'green-bourgeon',
          'green-emeraude',
          'green-menthe',
          'green-tilleul-verveine'
        ]}
      />
      <ChartTranscription
        title={card.title}
        labels={cardData.labels}
        data={cardData.data}
        type="pie-chart"
      />
    </>
  );
}
```

- [ ] **Step 4: Add `BarChartDisplay` component**

Add after `PieChartDisplay`:

```typescript
interface BarChartDisplayProps {
  card: DashboardCard;
  cardData: BarChartDataDTO;
}

function BarChartDisplay({ card, cardData }: Readonly<BarChartDisplayProps>) {
  return (
    <>
      <BarChart
        x={cardData.labels}
        y={cardData.data}
        horizontal={cardData.direction === 'horizontal'}
      />
      <ChartTranscription
        title={card.title}
        labels={cardData.labels}
        data={cardData.data}
        type="bar-chart"
      />
    </>
  );
}
```

- [ ] **Step 5: Update the dispatch in `AnalysisCard` to use `ts-pattern` and pass `card` to chart displays**

Replace the chart dispatch section in the `AnalysisCard` return:

```typescript
{match(data)
  .with({ type: 'pie-chart' }, (d) => (
    <PieChartDisplay card={card} cardData={d} />
  ))
  .with({ type: 'bar-chart' }, (d) => (
    <BarChartDisplay card={card} cardData={d} />
  ))
  .otherwise((d) => (
    <ShowcaseValue>{formatValue(d.data, card)}</ShowcaseValue>
  ))}
```

- [ ] **Step 6: Run frontend tests**

```bash
yarn nx test frontend -- AnalysisCard
```

Expected: all tests pass including the 6 new ones.

- [ ] **Step 7: Run typecheck**

```bash
yarn nx typecheck frontend
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/Analysis/AnalysisCard.tsx \
        frontend/src/components/Analysis/test/AnalysisCard.test.tsx
git commit -m "feat(frontend): render bar charts with DSFR BarChart and add transcription accordion"
```

---

## Final verification

- [ ] **Run the full test suite for affected projects**

```bash
yarn nx run-many -t test -p models server frontend
```

Expected: all tests pass.

- [ ] **Run typecheck across all workspaces**

```bash
yarn nx run-many -t typecheck --exclude=zero-logement-vacant
```

Expected: no errors.
