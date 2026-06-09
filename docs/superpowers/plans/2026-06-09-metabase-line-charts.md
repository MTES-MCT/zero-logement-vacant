# Metabase Line Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single-series line chart support to the Analysis page, including backend Metabase detection (`display === 'line'`), a DSFR `LineChart` renderer, and an accessible transcription accordion (raw-value format) for line charts.

**Architecture:** Extend the existing discriminated-union pattern (`CardType` / `CardDataDTO`) with a `'line-chart'` variant — no `direction` field (lines are always plotted along a horizontal x-axis). The backend detects `display: 'line'` and returns `LineChartDataDTO` with `labels` and `data`. The frontend renders a DSFR `LineChart` (flat arrays, single `color`) and reuses the existing `ChartTranscription` component, extended with a `'line-chart'` arm.

**Tech Stack:** TypeScript, React, `@codegouvfr/react-dsfr/Chart/LineChart`, `@codegouvfr/react-dsfr/Accordion`, `effect` (Array/pipe), `ts-pattern`, Vitest, MSW, nock, supertest

---

## File Map

| File | Change |
|------|--------|
| `packages/models/src/DashboardDTO.ts` | Add `LineChartCard`, `LineChartDataDTO`, extend unions |
| `packages/models/src/test/fixtures.ts` | Add `genLineChartCard()`, `genLineChartDataDTO()` |
| `server/src/services/metabase/metabase-service.ts` | Add `LineChartValue`, extend `CardValue` |
| `server/src/services/metabase/metabase-api.ts` | Detect `line`, handle line chart in `getCardValue` and `findDashcardRef` |
| `server/src/controllers/dashboardController.ts` | Handle `LineChartDataDTO` response |
| `server/src/controllers/test/dashboard-api.test.ts` | Add line chart API tests |
| `frontend/src/components/Analysis/LineChartDisplay.tsx` | New component using DSFR `LineChart` + transcription |
| `frontend/src/components/Analysis/ChartTranscription.tsx` | Add `'line-chart'` arm |
| `frontend/src/components/Analysis/AnalysisCard.tsx` | Add line-chart dispatch arm |
| `frontend/src/components/Analysis/test/AnalysisCard.test.tsx` | Add line chart + transcription tests |

---

## Task 1: Extend data model types

**Files:**
- Modify: `packages/models/src/DashboardDTO.ts`

- [ ] **Step 1: Add `LineChartCard`, `LineChartDataDTO`, extend the unions**

Replace the contents of `packages/models/src/DashboardDTO.ts` with:

```typescript
// packages/models/src/DashboardDTO.ts

export type CardType =
  | 'flat-number'
  | 'percentage'
  | 'pie-chart'
  | 'bar-chart'
  | 'line-chart';

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

export interface LineChartCard extends CardCommon {
  type: 'line-chart';
}

export type DashboardCard =
  | FlatNumberCard
  | PercentageCard
  | PieChartCard
  | BarChartCard
  | LineChartCard;

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

export interface LineChartDataDTO {
  id: number;
  type: 'line-chart';
  labels: string[];
  data: number[];
}

export type CardDataDTO =
  | ScalarCardDataDTO
  | PieChartDataDTO
  | BarChartDataDTO
  | LineChartDataDTO;

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

Expected: all workspaces pass (the existing `match(type).exhaustive()` in `ChartTranscription.tsx` will fail in a later task — that's expected, it gets fixed in Task 8).

- [ ] **Step 3: Commit**

```bash
git add packages/models/src/DashboardDTO.ts
git commit -m "feat(models): add LineChartCard and LineChartDataDTO types"
```

---

## Task 2: Add fixtures

**Files:**
- Modify: `packages/models/src/test/fixtures.ts`

- [ ] **Step 1: Add `genLineChartCard` and `genLineChartDataDTO` after `genBarChartDataDTO`**

In `packages/models/src/test/fixtures.ts`, locate `genBarChartDataDTO` (around line 1082) and add the two new functions immediately after it (before the `genCardDataDTO` deprecated alias):

```typescript
export function genLineChartCard(
  override?: Partial<LineChartCard>
): LineChartCard {
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    type: 'line-chart',
    title: faker.lorem.words(3),
    description: null,
    decimals: 0,
    position: { col: 0, row: 0 },
    size: { width: 6, height: 4 },
    ...override
  };
}

export function genLineChartDataDTO(
  override?: Partial<LineChartDataDTO>
): LineChartDataDTO {
  const series = faker.number.int({ min: 2, max: 5 });
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = 0; i < series; i++) {
    labels.push(faker.word.noun());
    data.push(faker.number.int({ min: 1, max: 10000 }));
  }
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    type: 'line-chart',
    labels,
    data,
    ...override
  };
}
```

Make sure `LineChartCard` and `LineChartDataDTO` are imported at the top of the file alongside the other types from `../DashboardDTO`.

- [ ] **Step 2: Run typecheck**

```bash
yarn nx run-many -t typecheck --exclude=zero-logement-vacant
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/models/src/test/fixtures.ts
git commit -m "feat(models): add genLineChartCard and genLineChartDataDTO fixtures"
```

---

## Task 3: Backend failing tests

**Files:**
- Modify: `server/src/controllers/test/dashboard-api.test.ts`

- [ ] **Step 1: Add mock Metabase dashboard and query-result data**

After `mockBarCardQueryResult` (around line 243), add:

```typescript
const mockMetabaseDashboardWithLineCard = {
  id: 13,
  dashcards: [
    {
      id: 970,
      card_id: 820,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: { 'card.title': 'Évolution mensuelle' },
      card: {
        id: 820,
        name: 'Évolution mensuelle',
        display: 'line',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockLineCardQueryResult = {
  data: {
    rows: [
      ['2024-01', 120],
      ['2024-02', 145],
      ['2024-03', 180]
    ],
    cols: [{ name: 'month' }, { name: 'count' }]
  },
  status: 'completed'
};
```

- [ ] **Step 2: Add a failing test in the `GET /dashboards/:id` block**

In the `describe('GET /dashboards/:id')` block, after the existing bar/row card tests, add:

```typescript
it('returns a line-chart card when display is "line"', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithLineCard);

  const response = await request(url)
    .get('/dashboards/13-analyses')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  const body = response.body as DashboardDTO;
  expect('cards' in body).toBe(true);
  if ('cards' in body) {
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0]).toMatchObject({
      id: 970,
      type: 'line-chart',
      title: 'Évolution mensuelle'
    });
  }
});
```

- [ ] **Step 3: Add a failing test in the `GET /dashboards/:did/cards/:cid` block**

After the existing bar-chart card tests, add:

```typescript
it('returns LineChartDataDTO for display "line"', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithLineCard);
  nock(METABASE_URL)
    .post('/api/dashboard/13/dashcard/970/card/820/query')
    .reply(200, mockLineCardQueryResult);

  const response = await request(url)
    .get('/dashboards/13-analyses/cards/970')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  expect(response.body).toMatchObject({
    id: 970,
    type: 'line-chart',
    labels: ['2024-01', '2024-02', '2024-03'],
    data: [120, 145, 180]
  });
});
```

- [ ] **Step 4: Run tests and confirm they fail**

```bash
yarn nx test server -- dashboard-api
```

Expected: 2 new tests fail — the dashboard test will not find a card with `type: 'line-chart'` (currently `normalizeDashcard` returns `null` for `display === 'line'`), and the card-value test will fail because the controller does not yet branch on line charts.

---

## Task 4: Extend MetabaseService types

**Files:**
- Modify: `server/src/services/metabase/metabase-service.ts`

- [ ] **Step 1: Add `LineChartValue` and extend `CardValue`**

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
export type LineChartValue = { labels: string[]; data: number[] };
export type CardValue = number | PieChartValue | BarChartValue | LineChartValue;

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

- [ ] **Step 2: Run typecheck — should still pass**

```bash
yarn nx typecheck server
```

Expected: no new errors (the import will be wired in the next task).

---

## Task 5: Implement line chart detection in `metabase-api.ts`

**Files:**
- Modify: `server/src/services/metabase/metabase-api.ts`

- [ ] **Step 1: Add `LineChartValue` to the imports from `./metabase-service`**

Update the import at the top of the file:

```typescript
import type {
  BarChartValue,
  CardValue,
  DashboardData,
  DashboardParameter,
  DashcardRef,
  LineChartValue,
  MetabaseService,
  PieChartValue
} from './metabase-service';
```

- [ ] **Step 2: Detect `line` display type in `normalizeDashcard`**

In `normalizeDashcard`, add the line chart branch immediately after the bar chart branch (before the `if (card.display !== 'scalar') return null;` line):

```typescript
if (card.display === 'line') {
  return {
    id: dashcard.id,
    type: 'line-chart',
    title: dashcard.visualization_settings['card.title'] ?? card.name,
    description: card.description,
    decimals: 0,
    position: { col: dashcard.col, row: dashcard.row },
    size: { width: dashcard.size_x, height: dashcard.size_y }
  };
}
```

- [ ] **Step 3: Add the line-chart branch in `findDashcardRef`**

In `findDashcardRef`, add the line-chart branch immediately after the bar-chart branch:

```typescript
if (normalized.type === 'line-chart') {
  return {
    dashcardId: found.id,
    cardId: found.card_id,
    type: 'line-chart',
    valueColumn: null,
    direction: null,
    dashboardParameters: (raw.parameters ?? []).map(
      (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
    )
  };
}
```

- [ ] **Step 4: Add the line-chart branch in `getCardValue`**

In the `MetabaseAPI.getCardValue` method, add the line-chart branch immediately after the bar-chart branch:

```typescript
if (cardType === 'line-chart') {
  const result: LineChartValue = {
    labels: data.data.rows.map((row) => String(row[0])),
    data: data.data.rows.map((row) => Number(row[1]))
  };
  return result;
}
```

- [ ] **Step 5: Run typecheck**

```bash
yarn nx typecheck server
```

Expected: only the controller has remaining errors (not yet updated).

---

## Task 6: Update the dashboard controller

**Files:**
- Modify: `server/src/controllers/dashboardController.ts`

- [ ] **Step 1: Import `LineChartValue`**

Update the existing import from `~/services/metabase/metabase-service`:

```typescript
import type {
  BarChartValue,
  LineChartValue,
  PieChartValue
} from '~/services/metabase/metabase-service';
```

- [ ] **Step 2: Add the line-chart branch in `findOneCard`**

In `findOneCard`, add the line-chart branch immediately after the existing bar-chart branch (before the pie-chart branch):

```typescript
if (dashcard.type === 'line-chart' && typeof raw === 'object' && raw !== null) {
  const lineRaw = raw as LineChartValue;
  response.status(constants.HTTP_STATUS_OK).json({
    id: numericCid,
    type: 'line-chart',
    labels: lineRaw.labels,
    data: lineRaw.data
  });
  return;
}
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

Expected: all tests pass including the 2 new line-chart tests.

- [ ] **Step 5: Commit**

```bash
git add \
  server/src/services/metabase/metabase-service.ts \
  server/src/services/metabase/metabase-api.ts \
  server/src/controllers/dashboardController.ts \
  server/src/controllers/test/dashboard-api.test.ts
git commit -m "feat(server): detect and map Metabase line charts"
```

---

## Task 7: Frontend failing tests

**Files:**
- Modify: `frontend/src/components/Analysis/test/AnalysisCard.test.tsx`

- [ ] **Step 1: Add imports for line chart fixtures**

Update the existing import from `@zerologementvacant/models/fixtures` to include `genLineChartCard` and `genLineChartDataDTO`:

```typescript
import {
  genBarChartCard,
  genBarChartDataDTO,
  genFlatNumberCard,
  genLineChartCard,
  genLineChartDataDTO,
  genPercentageCard,
  genPieChartCard,
  genPieChartDataDTO,
  genScalarCardDataDTO
} from '@zerologementvacant/models/fixtures';
```

- [ ] **Step 2: Add failing line chart rendering test**

Add at the end of the `describe('AnalysisCard')` block:

```typescript
it('renders a line chart card without error when card type is line-chart', async () => {
  const lineCard = genLineChartCard({ id: 90, title: 'Évolution mensuelle' });
  const cardData = genLineChartDataDTO({
    id: 90,
    labels: ['2024-01', '2024-02', '2024-03'],
    data: [120, 145, 180]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: lineCard, dashboardId });

  await screen.findByText('Évolution mensuelle');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Add failing transcription tests for line chart**

Add after the previous test:

```typescript
it('shows a transcription accordion for a line chart', async () => {
  const lineCard = genLineChartCard({ id: 90, title: 'Évolution mensuelle' });
  const cardData = genLineChartDataDTO({
    id: 90,
    labels: ['2024-01', '2024-02', '2024-03'],
    data: [120, 145, 180]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: lineCard, dashboardId });

  await screen.findByText('Évolution mensuelle');
  expect(screen.getByRole('button', { name: /Transcription/i })).toBeInTheDocument();
});

it('shows raw value transcription items for a line chart', async () => {
  const lineCard = genLineChartCard({ id: 90, title: 'Évolution mensuelle' });
  const cardData = genLineChartDataDTO({
    id: 90,
    labels: ['2024-01', '2024-02', '2024-03'],
    data: [120, 145, 180]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: lineCard, dashboardId });

  await screen.findByText('Évolution mensuelle');
  expect(screen.getByText('2024-01 : 120')).toBeInTheDocument();
  expect(screen.getByText('2024-02 : 145')).toBeInTheDocument();
  expect(screen.getByText('2024-03 : 180')).toBeInTheDocument();
});
```

- [ ] **Step 4: Run tests and confirm they fail**

```bash
yarn nx test frontend -- AnalysisCard
```

Expected: 3 new tests fail because `LineChartDisplay` does not exist yet and `AnalysisCard` does not dispatch on `'line-chart'`.

---

## Task 8: Extend `ChartTranscription`, add `LineChartDisplay`, update dispatch

**Files:**
- Modify: `frontend/src/components/Analysis/ChartTranscription.tsx`
- Create: `frontend/src/components/Analysis/LineChartDisplay.tsx`
- Modify: `frontend/src/components/Analysis/AnalysisCard.tsx`

- [ ] **Step 1: Add `'line-chart'` arm in `ChartTranscription`**

Replace the contents of `frontend/src/components/Analysis/ChartTranscription.tsx` with:

```typescript
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { Array, pipe } from 'effect';
import { match } from 'ts-pattern';

interface ChartTranscriptionProps {
  labels: string[];
  data: number[];
  type: 'pie-chart' | 'bar-chart' | 'line-chart';
}

function ChartTranscription(props: Readonly<ChartTranscriptionProps>) {
  const { labels, data, type } = props;

  const items = match(type)
    .with('pie-chart', () => {
      const total = pipe(
        data,
        Array.reduce(0, (acc, v) => acc + v)
      );
      if (total === 0) return [];
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
    .with('line-chart', () =>
      pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${value}`)
      )
    )
    .exhaustive();

  return (
    <Accordion label="Transcription">
      <List>
        {items.map((item, index) => (
          <ListItem key={index}>{item}</ListItem>
        ))}
      </List>
    </Accordion>
  );
}

export default ChartTranscription;
```

- [ ] **Step 2: Create `LineChartDisplay.tsx`**

Create `frontend/src/components/Analysis/LineChartDisplay.tsx` with:

```typescript
import { LineChart } from '@codegouvfr/react-dsfr/Chart/LineChart';
import type { LineChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

interface LineChartDisplayProps {
  chart: LineChartDataDTO;
}

function LineChartDisplay(props: Readonly<LineChartDisplayProps>) {
  const { chart } = props;

  return (
    <>
      <LineChart x={chart.labels} y={chart.data} color="blue-france" />
      <ChartTranscription
        labels={chart.labels}
        data={chart.data}
        type="line-chart"
      />
    </>
  );
}

export default LineChartDisplay;
```

Note: DSFR `LineChart` takes flat arrays (`x: any[]`, `y: number[]`) and a single `color: ChartColor` — *not* the nested arrays that `BarChart` uses.

- [ ] **Step 3: Add the line-chart dispatch arm in `AnalysisCard`**

In `frontend/src/components/Analysis/AnalysisCard.tsx`, update the import block and add the line-chart match arm.

First, add the new import alongside the existing chart-display imports:

```typescript
import BarChartDisplay from './BarChartDisplay';
import LineChartDisplay from './LineChartDisplay';
import PieChartDisplay from './PieChartDisplay';
```

Then replace the `match(data)` block in the JSX to include the new arm:

```typescript
{match(data)
  .with({ type: 'pie-chart' }, (d) => (
    <PieChartDisplay chart={d} />
  ))
  .with({ type: 'bar-chart' }, (d) => (
    <BarChartDisplay chart={d} />
  ))
  .with({ type: 'line-chart' }, (d) => (
    <LineChartDisplay chart={d} />
  ))
  .otherwise((d) => (
    <ShowcaseValue>{formatValue(d.data, card)}</ShowcaseValue>
  ))}
```

- [ ] **Step 4: Run frontend tests**

```bash
yarn nx test frontend -- AnalysisCard
```

Expected: all tests pass including the 3 new line-chart tests.

- [ ] **Step 5: Run typecheck**

```bash
yarn nx typecheck frontend
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Analysis/AnalysisCard.tsx \
        frontend/src/components/Analysis/ChartTranscription.tsx \
        frontend/src/components/Analysis/LineChartDisplay.tsx \
        frontend/src/components/Analysis/test/AnalysisCard.test.tsx
git commit -m "feat(frontend): render line charts with DSFR LineChart and extend transcription"
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
