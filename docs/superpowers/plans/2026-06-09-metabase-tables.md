# Metabase Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Metabase table (`display === 'table'`) support to the Analysis page, rendered via the existing `AdvancedTable` component, with per-column formatting driven by Metabase's `column_settings`.

**Architecture:** Extend the existing discriminated-union (`CardType` / `CardDataDTO`) with a `'table'` variant. The backend detects `display: 'table'`, resolves PM-curated columns (`table.columns` + `column_settings`) at `findDashcardRef` time into a Metabase-agnostic `TableColumnRef[]`, then `getCardValue` joins those refs with the query result's `cols` (for `display_name` and `base_type`) and indexes rows accordingly. The frontend renders an `AdvancedTable` with client-side sort, no pagination, and an `aria-label` caption.

**Tech Stack:** TypeScript, React, `@tanstack/react-table`, `@codegouvfr/react-dsfr` (DSFR), MUI, `ts-pattern`, Vitest, MSW, nock, supertest.

---

## File Map

| File | Change |
|------|--------|
| `packages/models/src/DashboardDTO.ts` | Add `TableCard`, `TableColumnMeta`, `TableDataDTO`; extend `CardType`, `DashboardCard`, `CardDataDTO` unions. |
| `packages/models/src/test/fixtures.ts` | Add `genTableCard()`, `genTableColumnMeta()`, `genTableDataDTO()`. |
| `server/src/services/metabase/metabase-service.ts` | Add `TableColumnRef`, `TableValue`; extend `DashcardRef` with `tableColumns`; extend `CardValue`; extend `getCardValue` signature with `tableColumns` param. |
| `server/src/services/metabase/metabase-api.ts` | Extend `MetabaseColumnSettings` (`column_title`) and `MetabaseCol` (`display_name`, `base_type`). Add `normalizeBaseType` and `resolveVisibleColumns` helpers. Detect `display: 'table'` in `normalizeDashcard`. Resolve `tableColumns` in `findDashcardRef`. Handle the table branch in `getCardValue`. |
| `server/src/controllers/dashboardController.ts` | Pass `dashcard.tableColumns` to `getCardValue`. Refactor the final response dispatch into explicit branches keyed off `dashcard.type` (replaces the current fragile `typeof raw === 'object'` fallthrough) and add the `'table'` case. |
| `server/src/controllers/test/dashboard-api.test.ts` | Add API tests for table dashcards (dashboard listing + card data). |
| `frontend/src/components/Analysis/TableDisplay.tsx` | New component. Renders `AdvancedTable` with column-aware cell formatting. |
| `frontend/src/components/Analysis/AnalysisCard.tsx` | Add the `'table'` branch to the dispatch; rename `(d)` → `(chart)` for chart branches and `(d)` → `(scalar)` for the scalar branch. |
| `frontend/src/components/Analysis/test/AnalysisCard.test.tsx` | Add table rendering + formatting + sort tests. |

---

## Task 1: Add data model types

**Files:**
- Modify: `packages/models/src/DashboardDTO.ts`

- [ ] **Step 1: Replace the file contents**

Open `packages/models/src/DashboardDTO.ts` and replace its contents with:

```typescript
// packages/models/src/DashboardDTO.ts

export type CardType =
  | 'flat-number'
  | 'percentage'
  | 'pie-chart'
  | 'bar-chart'
  | 'table';

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

export interface TableCard extends CardCommon {
  type: 'table';
}

export type DashboardCard =
  | FlatNumberCard
  | PercentageCard
  | PieChartCard
  | BarChartCard
  | TableCard;

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

export interface TableColumnMeta {
  name: string;
  displayName: string;
  baseType: 'number' | 'string' | 'date' | 'boolean' | 'unknown';
  decimals?: number;
  suffix?: string;
  numberStyle?: 'decimal' | 'percent' | 'currency' | 'scientific';
}

export interface TableDataDTO {
  id: number;
  type: 'table';
  columns: TableColumnMeta[];
  rows: unknown[][];
}

export type CardDataDTO =
  | ScalarCardDataDTO
  | PieChartDataDTO
  | BarChartDataDTO
  | TableDataDTO;

export const RESOURCE_VALUES = [
  '6-utilisateurs-de-zlv-sur-votre-structure',
  '7-autres-structures-de-votre-territoires-inscrites-sur-zlv',
  '13-analyses',
  '15-analyses-activites'
] as const;

export type Resource = (typeof RESOURCE_VALUES)[number];
```

- [ ] **Step 2: Verify the workspace typechecks**

Run: `yarn nx run-many -t typecheck`
Expected: PASS. (Other workspaces don't yet consume `TableCard` / `TableDataDTO`, so this is purely a definition addition. If any existing exhaustive `match(...).exhaustive()` over `CardType` exists, fix it — but the bar-chart spec already validated that the only exhaustive site is in `ChartTranscription`, which matches on `'pie-chart' | 'bar-chart'` (not `CardType`), and that the `AnalysisCard` dispatch uses `.otherwise(...)` rather than `.exhaustive()`. Both are safe.)

- [ ] **Step 3: Commit**

```bash
git add packages/models/src/DashboardDTO.ts
git commit -m "feat(models): add TableCard and TableDataDTO types"
```

---

## Task 2: Add table fixtures

**Files:**
- Modify: `packages/models/src/test/fixtures.ts`

- [ ] **Step 1: Update the type import block**

In `packages/models/src/test/fixtures.ts`, find the import block starting at line 8:

```typescript
import type {
  BarChartCard,
  BarChartDataDTO,
  DashboardCard,
  DashboardDTO,
  FlatNumberCard,
  PercentageCard,
  PieChartCard,
  PieChartDataDTO,
  ScalarCardDataDTO,
  Tab
} from '../DashboardDTO';
```

Replace it with:

```typescript
import type {
  BarChartCard,
  BarChartDataDTO,
  DashboardCard,
  DashboardDTO,
  FlatNumberCard,
  PercentageCard,
  PieChartCard,
  PieChartDataDTO,
  ScalarCardDataDTO,
  Tab,
  TableCard,
  TableColumnMeta,
  TableDataDTO
} from '../DashboardDTO';
```

- [ ] **Step 2: Append the three new fixtures**

Append the following functions at the very end of `packages/models/src/test/fixtures.ts` (after `genCardDataDTO`):

```typescript
const TABLE_BASE_TYPES = ['number', 'string', 'date', 'boolean'] as const;

export function genTableColumnMeta(
  override?: Partial<TableColumnMeta>
): TableColumnMeta {
  const name = override?.name ?? faker.lorem.word();
  const baseType =
    override?.baseType ?? faker.helpers.arrayElement(TABLE_BASE_TYPES);
  return {
    name,
    displayName: faker.lorem.words(2),
    baseType,
    ...override
  };
}

export function genTableCard(
  override?: Partial<TableCard>
): TableCard {
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    type: 'table',
    title: faker.lorem.words(3),
    description: null,
    decimals: 0,
    position: { col: 0, row: 0 },
    size: { width: 12, height: 6 },
    ...override
  };
}

function genCellValue(baseType: TableColumnMeta['baseType']): unknown {
  switch (baseType) {
    case 'number':
      return faker.number.int({ min: 0, max: 100000 });
    case 'string':
      return faker.word.noun();
    case 'date':
      return faker.date.recent().toISOString();
    case 'boolean':
      return faker.datatype.boolean();
    default:
      return null;
  }
}

export function genTableDataDTO(
  override?: Partial<TableDataDTO>
): TableDataDTO {
  const columnCount = faker.number.int({ min: 2, max: 4 });
  const rowCount = faker.number.int({ min: 3, max: 8 });

  const columns =
    override?.columns ??
    Array.from({ length: columnCount }, () => genTableColumnMeta());

  const rows =
    override?.rows ??
    Array.from({ length: rowCount }, () =>
      columns.map((c) => genCellValue(c.baseType))
    );

  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    type: 'table',
    columns,
    rows,
    ...override
  };
}
```

- [ ] **Step 3: Verify typecheck**

Run: `yarn nx typecheck @zerologementvacant/models`
Expected: PASS.

- [ ] **Step 4: Verify tests still pass**

Run: `yarn nx test @zerologementvacant/models`
Expected: PASS (existing tests unchanged; new fixtures are not yet referenced).

- [ ] **Step 5: Commit**

```bash
git add packages/models/src/test/fixtures.ts
git commit -m "feat(models): add genTableCard, genTableColumnMeta and genTableDataDTO fixtures"
```

---

## Task 3: Extend the Metabase service types

**Files:**
- Modify: `server/src/services/metabase/metabase-service.ts`

- [ ] **Step 1: Replace the file contents**

Open `server/src/services/metabase/metabase-service.ts` and replace its contents with:

```typescript
import type {
  CardType,
  DashboardCard,
  Tab,
  TableColumnMeta
} from '@zerologementvacant/models';

export type DashboardData =
  | { tabs: ReadonlyArray<Tab> }
  | { cards: ReadonlyArray<DashboardCard> };

export interface DashboardParameter {
  id: string;
  slug: string;
  type: string;
}

// PM-curated column metadata, Metabase-agnostic: resolved from `table.columns`
// + `column_settings` at findDashcardRef time. Empty array means "PM did not
// curate columns — use every column from the query result, in query order".
export interface TableColumnRef {
  name: string;
  columnTitle?: string;
  decimals?: number;
  suffix?: string;
  numberStyle?: string;
}

export interface DashcardRef {
  dashcardId: number;
  cardId: number;
  type: CardType;
  valueColumn: string | null;
  direction: 'horizontal' | 'vertical' | null;
  tableColumns: ReadonlyArray<TableColumnRef> | null;
  dashboardParameters: ReadonlyArray<DashboardParameter>;
}

export type PieChartValue = { labels: string[]; data: number[] };
export type BarChartValue = {
  direction: 'horizontal' | 'vertical';
  labels: string[];
  data: number[];
};
export type TableValue = {
  columns: TableColumnMeta[];
  rows: unknown[][];
};
export type CardValue = number | PieChartValue | BarChartValue | TableValue;

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
    direction: 'horizontal' | 'vertical' | null,
    tableColumns: ReadonlyArray<TableColumnRef> | null
  ): Promise<CardValue>;
}
```

- [ ] **Step 2: Verify typecheck (expect transient errors in `metabase-api.ts` and the controller)**

Run: `yarn nx typecheck server`
Expected: FAIL with errors in `metabase-api.ts` (missing `tableColumns` in `DashcardRef` returns; `getCardValue` signature mismatch) and `dashboardController.ts` (call site missing 8th arg). These are fixed by Tasks 4–8.

No commit yet — the workspace is in a transient state.

---

## Task 4: Extend Metabase API low-level types + add helpers

**Files:**
- Modify: `server/src/services/metabase/metabase-api.ts`

- [ ] **Step 1: Extend `MetabaseColumnSettings`, `MetabaseCol`, and the service-type imports**

In `server/src/services/metabase/metabase-api.ts`, replace this block at the top of the file (lines 1–13):

```typescript
import axios from 'axios';

import type { CardType, DashboardCard, Tab } from '@zerologementvacant/models';
import config from '~/infra/config';
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

with:

```typescript
import axios from 'axios';

import type {
  CardType,
  DashboardCard,
  Tab,
  TableColumnMeta
} from '@zerologementvacant/models';
import config from '~/infra/config';
import type {
  BarChartValue,
  CardValue,
  DashboardData,
  DashboardParameter,
  DashcardRef,
  MetabaseService,
  PieChartValue,
  TableColumnRef,
  TableValue
} from './metabase-service';
```

Then update `MetabaseColumnSettings` (currently lines 17–21):

```typescript
interface MetabaseColumnSettings {
  number_style?: string;
  decimals?: number;
  suffix?: string;
  column_title?: string;
}
```

Then update `MetabaseCol` (currently lines 72–74):

```typescript
interface MetabaseCol {
  name: string;
  display_name?: string;
  base_type?: string;
}
```

- [ ] **Step 2: Add `normalizeBaseType` and `resolveVisibleColumns` helpers**

Insert the following helpers in `metabase-api.ts`, immediately before `function normalizeDashcard(...)`:

```typescript
function normalizeBaseType(
  metabaseType: string | undefined
): TableColumnMeta['baseType'] {
  if (!metabaseType) return 'unknown';
  if (/Integer|Decimal|Float|Number/.test(metabaseType)) return 'number';
  if (/Date|Time/.test(metabaseType)) return 'date';
  if (metabaseType.endsWith('Boolean')) return 'boolean';
  if (metabaseType.endsWith('Text') || metabaseType.endsWith('String')) {
    return 'string';
  }
  return 'unknown';
}

// Returns the PM-curated column names in display order. Returns null when no
// `table.columns` is configured (callers fall back to query columns).
function resolveVisibleColumnNames(
  settings: MetabaseVisualizationSettings
): string[] | null {
  const tableColumns = settings['table.columns'];
  if (!tableColumns || tableColumns.length === 0) return null;
  return tableColumns.filter((c) => c.enabled).map((c) => c.name);
}

function buildTableColumnRefs(
  settings: MetabaseVisualizationSettings
): TableColumnRef[] {
  const names = resolveVisibleColumnNames(settings);
  if (names === null) return []; // sentinel: use all query cols
  return names.map((name) => {
    const colSettings =
      settings.column_settings?.[JSON.stringify(['name', name])];
    return {
      name,
      ...(colSettings?.column_title !== undefined && {
        columnTitle: colSettings.column_title
      }),
      ...(colSettings?.decimals !== undefined && {
        decimals: colSettings.decimals
      }),
      ...(colSettings?.suffix !== undefined && { suffix: colSettings.suffix }),
      ...(colSettings?.number_style !== undefined && {
        numberStyle: colSettings.number_style
      })
    };
  });
}
```

- [ ] **Step 3: Verify typecheck (still transient)**

Run: `yarn nx typecheck server`
Expected: still FAIL — `tableColumns` not yet returned from `findDashcardRef` or `normalizeDashcard`, and `getCardValue` signature still 7-arg. Tasks 5–7 fix these.

No commit yet.

---

## Task 5: Detect `display === 'table'` in `normalizeDashcard`

**Files:**
- Modify: `server/src/services/metabase/metabase-api.ts`
- Test: `server/src/controllers/test/dashboard-api.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `server/src/controllers/test/dashboard-api.test.ts`, immediately above `it('returns 422 for unknown slug', …)` inside the `describe('GET /dashboards/:id', …)` block:

```typescript
const mockMetabaseDashboardWithTableCard = {
  id: 13,
  dashcards: [
    {
      id: 970,
      card_id: 820,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 12,
      size_y: 6,
      visualization_settings: { 'card.title': 'Statistiques par EPCI' },
      card: {
        id: 820,
        name: 'Statistiques par EPCI',
        display: 'table',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

it('returns a table card when display is "table"', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithTableCard);

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
      type: 'table',
      title: 'Statistiques par EPCI'
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test server -- dashboard-api`
Expected: FAIL — `body.cards` is empty (the unknown `display: 'table'` falls into the `null` branch of `normalizeDashcard` and is filtered out).

- [ ] **Step 3: Add the table branch in `normalizeDashcard`**

In `server/src/services/metabase/metabase-api.ts`, immediately after the existing bar-chart branch (the block ending at line 160 with the `if (card.display === 'bar' || card.display === 'row')` close brace), add:

```typescript
if (card.display === 'table') {
  return {
    id: dashcard.id,
    type: 'table',
    title: dashcard.visualization_settings['card.title'] ?? card.name,
    description: card.description,
    decimals: 0,
    position: { col: dashcard.col, row: dashcard.row },
    size: { width: dashcard.size_x, height: dashcard.size_y }
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test server -- dashboard-api`
Expected: PASS for `returns a table card when display is "table"`. Other dashboard listing tests still pass.

The `GET /dashboards/:did/cards/:cid` table-data tests (added in Task 9) will still fail until Tasks 6–8 are done.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/metabase/metabase-api.ts server/src/controllers/test/dashboard-api.test.ts
git commit -m "feat(server): detect and map Metabase tables"
```

---

## Task 6: Resolve `tableColumns` in `findDashcardRef`; populate `tableColumns: null` in other branches

**Files:**
- Modify: `server/src/services/metabase/metabase-api.ts`

- [ ] **Step 1: Update `findDashcardRef` — pie/bar branches set `tableColumns: null`; add a table branch; the scalar fallback also sets `tableColumns: null`**

Replace the existing `findDashcardRef` function (currently lines 199–248) with:

```typescript
function findDashcardRef(
  raw: MetabaseDashboardRaw,
  dashcardId: number
): DashcardRef | null {
  const found = raw.dashcards.find((dc) => dc.id === dashcardId);
  if (!found || found.card_id === null) return null;
  const normalized = normalizeDashcard(found);
  if (!normalized) return null;

  const dashboardParameters = (raw.parameters ?? []).map(
    (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
  );

  if (normalized.type === 'pie-chart') {
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: 'pie-chart',
      valueColumn: null,
      direction: null,
      tableColumns: null,
      dashboardParameters
    };
  }

  if (normalized.type === 'bar-chart') {
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: 'bar-chart',
      valueColumn: null,
      direction: found.card!.display === 'bar' ? 'vertical' : 'horizontal',
      tableColumns: null,
      dashboardParameters
    };
  }

  if (normalized.type === 'table') {
    const settings = mergeVisualizationSettings(
      found.card!.visualization_settings,
      found.visualization_settings
    );
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: 'table',
      valueColumn: null,
      direction: null,
      tableColumns: buildTableColumnRefs(settings),
      dashboardParameters
    };
  }

  const settings = mergeVisualizationSettings(
    found.card!.visualization_settings,
    found.visualization_settings
  );
  return {
    dashcardId: found.id,
    cardId: found.card_id,
    type: normalized.type,
    valueColumn: settings['scalar.field'] ?? null,
    direction: null,
    tableColumns: null,
    dashboardParameters
  };
}
```

- [ ] **Step 2: Verify typecheck (still transient on `getCardValue` and controller)**

Run: `yarn nx typecheck server`
Expected: still FAIL — `getCardValue` signature and controller call site still need updating (Tasks 7–8).

No commit yet — workspace remains in transient state until Task 8 closes it.

---

## Task 7: Implement the `'table'` branch in `getCardValue`

**Files:**
- Modify: `server/src/services/metabase/metabase-api.ts`

- [ ] **Step 1: Extend the `getCardValue` signature and add the table branch**

Replace the existing `getCardValue` method on `class MetabaseAPI` (currently lines 278–316) with:

```typescript
async getCardValue(
  dashboardId: number,
  dashcardId: number,
  cardId: number,
  parameters: ReadonlyArray<DashboardParameter & { value: string }>,
  valueColumn: string | null,
  cardType: CardType,
  direction: 'horizontal' | 'vertical' | null,
  tableColumns: ReadonlyArray<TableColumnRef> | null
): Promise<CardValue> {
  const { data } = await this.http.post<MetabaseQueryResult>(
    `/api/dashboard/${dashboardId}/dashcard/${dashcardId}/card/${cardId}/query`,
    { parameters }
  );

  if (cardType === 'pie-chart') {
    const result: PieChartValue = {
      labels: data.data.rows.map((row) => String(row[0])),
      data: data.data.rows.map((row) => Number(row[1]))
    };
    return result;
  }

  if (cardType === 'bar-chart') {
    if (direction === null) {
      throw new Error('direction is required for bar-chart card type');
    }
    const result: BarChartValue = {
      direction,
      labels: data.data.rows.map((row) => String(row[0])),
      data: data.data.rows.map((row) => Number(row[1]))
    };
    return result;
  }

  if (cardType === 'table') {
    if (tableColumns === null) {
      throw new Error('tableColumns is required for table card type');
    }
    // Refs: PM curation, or empty → use every query column in query order.
    const effectiveRefs: TableColumnRef[] =
      tableColumns.length > 0
        ? [...tableColumns]
        : data.data.cols.map((c) => ({ name: c.name }));

    const columns: TableColumnMeta[] = effectiveRefs.flatMap((ref) => {
      const index = data.data.cols.findIndex((c) => c.name === ref.name);
      if (index === -1) return [];
      const col = data.data.cols[index];
      return [
        {
          name: ref.name,
          displayName: ref.columnTitle ?? col.display_name ?? ref.name,
          baseType: normalizeBaseType(col.base_type),
          ...(ref.decimals !== undefined && { decimals: ref.decimals }),
          ...(ref.suffix !== undefined && { suffix: ref.suffix }),
          ...(ref.numberStyle !== undefined && {
            numberStyle: ref.numberStyle as TableColumnMeta['numberStyle']
          })
        }
      ];
    });

    const indices = columns.map((c) =>
      data.data.cols.findIndex((qc) => qc.name === c.name)
    );
    const rows = data.data.rows.map((row) => indices.map((i) => row[i]));

    const result: TableValue = { columns, rows };
    return result;
  }

  const colIndex = valueColumn
    ? data.data.cols.findIndex((c) => c.name === valueColumn)
    : -1;
  return data.data.rows[0][colIndex !== -1 ? colIndex : 0] as number;
}
```

- [ ] **Step 2: Verify typecheck (still transient on controller)**

Run: `yarn nx typecheck server`
Expected: FAIL only on `dashboardController.ts` — call site is missing the 8th arg. Task 8 fixes that.

No commit yet.

---

## Task 8: Plumb `tableColumns` from controller + replace fragile dispatch with explicit branches

**Files:**
- Modify: `server/src/controllers/dashboardController.ts`

- [ ] **Step 1: Replace the file contents**

Open `server/src/controllers/dashboardController.ts` and replace its contents with:

```typescript
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'node:http2';
import jwt from 'jsonwebtoken';

import type { CardDataDTO, DashboardDTO, Resource } from '@zerologementvacant/models';
import type {
  BarChartValue,
  PieChartValue,
  TableValue
} from '~/services/metabase/metabase-service';
import { RESOURCE_VALUES } from '@zerologementvacant/models';
import DashcardMissingError from '~/errors/dashcardMissingError';
import UnprocessableEntityError from '~/errors/unprocessableEntityError';
import config from '~/infra/config';
import { createURL, getResource } from '~/models/DashboardApi';
import { metabaseAPI } from '~/services/metabase/metabase-api';

async function findOne(
  request: Request<{ id: Resource }>,
  response: Response<DashboardDTO>
): Promise<void> {
  const { auth, params } = request as AuthenticatedRequest<{ id: Resource }>;

  const numericId = getResource(params.id);

  const [token, normalized] = await Promise.all([
    sign({
      resource: { dashboard: numericId },
      params: { id: auth.establishmentId }
    }),
    metabaseAPI.getDashboard(numericId)
  ]);

  const url = createURL({ domain: config.metabase.domain, token });

  response
    .status(constants.HTTP_STATUS_OK)
    .json({ id: numericId, url, ...normalized });
}

async function findOneCard(
  request: Request<{ did: string; cid: string }>,
  response: Response<CardDataDTO>
): Promise<void> {
  const { auth, params } = request as AuthenticatedRequest<{
    did: string;
    cid: string;
  }>;

  const numericDid = RESOURCE_VALUES.includes(params.did as Resource)
    ? getResource(params.did as Resource)
    : parseInt(params.did, 10);
  if (isNaN(numericDid)) {
    throw new UnprocessableEntityError();
  }

  const numericCid = parseInt(params.cid, 10);
  if (isNaN(numericCid)) {
    throw new UnprocessableEntityError();
  }

  const dashcard = await metabaseAPI.findDashcard(numericDid, numericCid);
  if (!dashcard) throw new DashcardMissingError(numericCid);

  const queryParameters = dashcard.dashboardParameters
    .filter((p) => p.slug === 'id')
    .map((p) => ({ ...p, value: auth.establishmentId }));

  const raw = await metabaseAPI.getCardValue(
    numericDid,
    dashcard.dashcardId,
    dashcard.cardId,
    queryParameters,
    dashcard.valueColumn,
    dashcard.type,
    dashcard.direction,
    dashcard.tableColumns
  );

  if (dashcard.type === 'bar-chart') {
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

  if (dashcard.type === 'pie-chart') {
    const pieRaw = raw as PieChartValue;
    response.status(constants.HTTP_STATUS_OK).json({
      id: numericCid,
      type: 'pie-chart',
      labels: pieRaw.labels,
      data: pieRaw.data
    });
    return;
  }

  if (dashcard.type === 'table') {
    const tableRaw = raw as TableValue;
    response.status(constants.HTTP_STATUS_OK).json({
      id: numericCid,
      type: 'table',
      columns: tableRaw.columns,
      rows: tableRaw.rows
    });
    return;
  }

  const scalar = raw as number;
  const data = dashcard.type === 'percentage' ? scalar / 100 : scalar;
  response.status(constants.HTTP_STATUS_OK).json({
    id: numericCid,
    type: dashcard.type as 'flat-number' | 'percentage',
    data
  });
}

function sign(payload: object): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      config.metabase.token,
      {
        algorithm: 'HS256',
        expiresIn: '10m'
      },
      (err, token) => {
        if (err) {
          return reject(err);
        }
        if (!token) return reject(new Error('jwt.sign produced no token'));
        return resolve(token);
      }
    );
  });
}

export default {
  findOne,
  findOneCard
};
```

- [ ] **Step 2: Verify typecheck passes**

Run: `yarn nx typecheck server`
Expected: PASS.

- [ ] **Step 3: Run the existing dashboard-api tests to verify no regression**

Run: `yarn nx test server -- dashboard-api`
Expected: PASS for all currently-existing tests (scalar / pie / bar / table-listing). The card-data table tests added in Task 9 will go next.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/metabase/metabase-service.ts server/src/services/metabase/metabase-api.ts server/src/controllers/dashboardController.ts
git commit -m "feat(server): expose TableDataDTO from Metabase service and controller"
```

---

## Task 9: Add backend API tests for table card data

**Files:**
- Modify: `server/src/controllers/test/dashboard-api.test.ts`

- [ ] **Step 1: Add the dashboard fixtures with `table.columns` + `column_settings`**

Append these mocks to the top-of-file constants block in `dashboard-api.test.ts` (immediately after `mockBarCardQueryResult`):

```typescript
// Table dashcard with PM-curated columns: count is hidden, code is shown
// with a French header override, and rate is formatted as a percentage.
const mockMetabaseDashboardWithCuratedTable = {
  id: 13,
  dashcards: [
    {
      id: 971,
      card_id: 821,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 12,
      size_y: 6,
      visualization_settings: {
        'card.title': 'Taux par EPCI',
        'table.columns': [
          { name: 'code', enabled: true },
          { name: 'count', enabled: false },
          { name: 'rate', enabled: true }
        ],
        column_settings: {
          '["name","code"]': { column_title: 'Code EPCI' },
          '["name","rate"]': {
            number_style: 'percent',
            decimals: 1,
            suffix: ' %'
          }
        }
      },
      card: {
        id: 821,
        name: 'Taux par EPCI',
        display: 'table',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockCuratedTableQueryResult = {
  data: {
    rows: [
      ['200054807', 42, 0.123],
      ['243500139', 18, 0.087]
    ],
    cols: [
      { name: 'code', display_name: 'EPCI Code', base_type: 'type/Text' },
      { name: 'count', display_name: 'Count', base_type: 'type/BigInteger' },
      { name: 'rate', display_name: 'Rate', base_type: 'type/Float' }
    ]
  },
  status: 'completed'
};

// Table dashcard with no `table.columns` configured — fallback to all query cols.
const mockMetabaseDashboardWithRawTable = {
  id: 13,
  dashcards: [
    {
      id: 972,
      card_id: 822,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 12,
      size_y: 6,
      visualization_settings: { 'card.title': 'Logements bruts' },
      card: {
        id: 822,
        name: 'Logements bruts',
        display: 'table',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockRawTableQueryResult = {
  data: {
    rows: [
      ['APPART', 4876],
      ['MAISON', 652]
    ],
    cols: [
      { name: 'housing_kind', display_name: 'Type', base_type: 'type/Text' },
      { name: 'count', display_name: 'Count', base_type: 'type/BigInteger' }
    ]
  },
  status: 'completed'
};
```

- [ ] **Step 2: Add the failing API tests**

In `dashboard-api.test.ts`, append the following inside the `describe('GET /dashboards/:did/cards/:cid', …)` block, immediately above `it('returns 404 when dashcard not found', …)`:

```typescript
it('returns TableDataDTO with curated columns and per-column settings', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithCuratedTable);
  nock(METABASE_URL)
    .post('/api/dashboard/13/dashcard/971/card/821/query')
    .reply(200, mockCuratedTableQueryResult);

  const response = await request(url)
    .get('/dashboards/13-analyses/cards/971')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  expect(response.body).toMatchObject({
    id: 971,
    type: 'table',
    columns: [
      {
        name: 'code',
        displayName: 'Code EPCI', // column_title override wins
        baseType: 'string'
      },
      {
        name: 'rate',
        displayName: 'Rate', // falls back to col.display_name
        baseType: 'number',
        decimals: 1,
        suffix: ' %',
        numberStyle: 'percent'
      }
    ],
    // 'count' is filtered out because table.columns[].enabled = false.
    // Rows are aligned to the curated column order: [code, rate].
    rows: [
      ['200054807', 0.123],
      ['243500139', 0.087]
    ]
  });
  expect(response.body.columns).toHaveLength(2);
});

it('returns TableDataDTO with every query column when table.columns is absent', async () => {
  nock(METABASE_URL)
    .get('/api/dashboard/13')
    .reply(200, mockMetabaseDashboardWithRawTable);
  nock(METABASE_URL)
    .post('/api/dashboard/13/dashcard/972/card/822/query')
    .reply(200, mockRawTableQueryResult);

  const response = await request(url)
    .get('/dashboards/13-analyses/cards/972')
    .use(tokenProvider(user));

  expect(response.status).toBe(constants.HTTP_STATUS_OK);
  expect(response.body).toMatchObject({
    id: 972,
    type: 'table',
    columns: [
      { name: 'housing_kind', displayName: 'Type', baseType: 'string' },
      { name: 'count', displayName: 'Count', baseType: 'number' }
    ],
    rows: [
      ['APPART', 4876],
      ['MAISON', 652]
    ]
  });
  // No decimals / suffix / numberStyle leaked when settings are absent.
  expect(response.body.columns[0]).not.toHaveProperty('decimals');
  expect(response.body.columns[1]).not.toHaveProperty('suffix');
});
```

- [ ] **Step 3: Run the tests**

Run: `yarn nx test server -- dashboard-api`
Expected: PASS for the two new tests plus all pre-existing ones.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/test/dashboard-api.test.ts
git commit -m "test(server): cover table dashcards in dashboard API tests"
```

---

## Task 10: Add the `TableDisplay` frontend component (failing test first)

**Files:**
- Test: `frontend/src/components/Analysis/test/AnalysisCard.test.tsx`
- Create: `frontend/src/components/Analysis/TableDisplay.tsx`

- [ ] **Step 1: Add the failing test for table rendering, formatting, and sort**

Open `frontend/src/components/Analysis/test/AnalysisCard.test.tsx`. Update the existing import from `@zerologementvacant/models/fixtures` to also import the table fixtures:

```typescript
import {
  genBarChartCard,
  genBarChartDataDTO,
  genFlatNumberCard,
  genPercentageCard,
  genPieChartCard,
  genPieChartDataDTO,
  genScalarCardDataDTO,
  genTableCard,
  genTableDataDTO
} from '@zerologementvacant/models/fixtures';
```

Add `userEvent` to the testing imports at the top of the file:

```typescript
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

Then append the following tests inside `describe('AnalysisCard', …)`:

```typescript
it('renders a table card with PM-curated headers', async () => {
  const tableCard = genTableCard({ id: 90, title: 'Statistiques par EPCI' });
  const cardData = genTableDataDTO({
    id: 90,
    columns: [
      { name: 'code', displayName: 'Code EPCI', baseType: 'string' },
      { name: 'rate', displayName: 'Taux', baseType: 'number', decimals: 1, numberStyle: 'percent' }
    ],
    rows: [
      ['200054807', 0.123],
      ['243500139', 0.087]
    ]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: tableCard, dashboardId });

  await screen.findByText('Statistiques par EPCI');
  // Headers
  expect(screen.getByRole('columnheader', { name: /Code EPCI/i })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: /Taux/i })).toBeInTheDocument();
  // String cell as-is
  expect(screen.getByRole('cell', { name: '200054807' })).toBeInTheDocument();
  // Percentage cell: fr-FR locale formats 0.123 as "12,3 %" (narrow no-break space)
  expect(screen.getByText(/12[,.]3[\s ]%/)).toBeInTheDocument();
});

it('formats numeric cells with fr-FR locale and applies suffix', async () => {
  const tableCard = genTableCard({ id: 91, title: 'Surfaces' });
  const cardData = genTableDataDTO({
    id: 91,
    columns: [
      { name: 'label', displayName: 'Libellé', baseType: 'string' },
      { name: 'amount', displayName: 'Montant', baseType: 'number', suffix: ' €' }
    ],
    rows: [['Total', 1234567]]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: tableCard, dashboardId });

  // fr-FR: 1 234 567 (narrow no-break space), suffix appended verbatim
  expect(await screen.findByText(/1[\s ]234[\s ]567 €/)).toBeInTheDocument();
});

it('renders null cell values as an empty string', async () => {
  const tableCard = genTableCard({ id: 92, title: 'Vide' });
  const cardData = genTableDataDTO({
    id: 92,
    columns: [
      { name: 'label', displayName: 'Libellé', baseType: 'string' },
      { name: 'count', displayName: 'Total', baseType: 'number' }
    ],
    rows: [['Sans donnée', null]]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: tableCard, dashboardId });

  await screen.findByText('Sans donnée');
  // Locate the row that contains "Sans donnée" and assert the *Total* cell is empty.
  const row = screen.getByText('Sans donnée').closest('tr');
  expect(row).not.toBeNull();
  const cells = within(row as HTMLElement).getAllByRole('cell');
  // [Libellé cell, Total cell] — selection column is not enabled here.
  expect(cells[1].textContent).toBe('');
});

it('formats date cells with fr-FR locale', async () => {
  const tableCard = genTableCard({ id: 94, title: 'Dates' });
  const cardData = genTableDataDTO({
    id: 94,
    columns: [
      { name: 'event_at', displayName: 'Date', baseType: 'date' }
    ],
    rows: [['2024-03-15T10:30:00.000Z']]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: tableCard, dashboardId });

  // fr-FR: 15/03/2024
  expect(await screen.findByText('15/03/2024')).toBeInTheDocument();
});

it('exposes the card title as the table caption (aria-label)', async () => {
  const tableCard = genTableCard({ id: 95, title: 'Tableau intitulé' });
  const cardData = genTableDataDTO({
    id: 95,
    columns: [{ name: 'label', displayName: 'Libellé', baseType: 'string' }],
    rows: [['valeur']]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: tableCard, dashboardId });

  expect(
    await screen.findByRole('table', { name: 'Tableau intitulé' })
  ).toBeInTheDocument();
});

it('sorts numeric rows when a sortable column header is clicked', async () => {
  const user = userEvent.setup();
  const tableCard = genTableCard({ id: 93, title: 'Tri numérique' });
  const cardData = genTableDataDTO({
    id: 93,
    columns: [
      { name: 'label', displayName: 'Libellé', baseType: 'string' },
      { name: 'amount', displayName: 'Montant', baseType: 'number' }
    ],
    rows: [
      ['A', 30],
      ['B', 10],
      ['C', 20]
    ]
  });
  mockAPI.use(
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      () => HttpResponse.json(cardData)
    )
  );

  setup({ card: tableCard, dashboardId });

  await screen.findByText('Tri numérique');
  // Click the Montant sort toggle. AdvancedTable renders a SortButton next to
  // sortable headers; its accessible name comes from columnDef.meta.sort.title
  // and falls back to `Trier par <header.id>`. We use the column id here, "amount".
  const sortButton = await screen.findByRole('button', { name: /Trier par amount/i });
  await user.click(sortButton);

  const labelCells = screen.getAllByRole('cell').filter(
    (c) => c.textContent && /^[ABC]$/.test(c.textContent.trim())
  );
  // After ascending sort by amount: B (10), C (20), A (30)
  expect(labelCells.map((c) => c.textContent?.trim())).toEqual(['B', 'C', 'A']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test frontend -- AnalysisCard`
Expected: FAIL — `AnalysisCard` currently has no `'table'` branch and `TableDisplay` does not exist.

- [ ] **Step 3: Create `TableDisplay.tsx`**

Create `frontend/src/components/Analysis/TableDisplay.tsx`:

```typescript
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  TableColumnMeta,
  TableDataDTO
} from '@zerologementvacant/models';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';

interface TableDisplayProps {
  chart: TableDataDTO;
  caption: string;
}

type Row = Record<string, unknown>;

function formatCell(value: unknown, meta: TableColumnMeta): string {
  if (value === null || value === undefined) return '';

  if (meta.baseType === 'number' && typeof value === 'number') {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: meta.numberStyle === 'percent' ? 'percent' : 'decimal',
      maximumFractionDigits: meta.decimals ?? 0,
      minimumFractionDigits: meta.decimals ?? 0
    }).format(value);
    return meta.suffix && meta.numberStyle !== 'percent'
      ? `${formatted}${meta.suffix}`
      : formatted;
  }

  if (meta.baseType === 'date' && typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat('fr-FR').format(date);
  }

  return String(value);
}

function TableDisplay(props: Readonly<TableDisplayProps>) {
  const { chart, caption } = props;

  const data = useMemo<Row[]>(
    () =>
      chart.rows.map((row) =>
        Object.fromEntries(chart.columns.map((c, i) => [c.name, row[i]]))
      ),
    [chart.rows, chart.columns]
  );

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      chart.columns.map((meta) => ({
        id: meta.name,
        accessorKey: meta.name,
        header: meta.displayName,
        cell: ({ getValue }) => formatCell(getValue(), meta)
      })),
    [chart.columns]
  );

  return (
    <AdvancedTable<Row>
      columns={columns}
      data={data}
      enableSorting
      paginate={false}
      caption={caption}
      tableProps={{ noCaption: true, bordered: true }}
    />
  );
}

export default TableDisplay;
```

- [ ] **Step 4: Wire dispatch in `AnalysisCard.tsx`**

Open `frontend/src/components/Analysis/AnalysisCard.tsx`. Add the `TableDisplay` import next to the others:

```typescript
import BarChartDisplay from './BarChartDisplay';
import PieChartDisplay from './PieChartDisplay';
import TableDisplay from './TableDisplay';
```

Replace the `match(data)` block (currently lines 91–100) with:

```typescript
{match(data)
  .with({ type: 'pie-chart' }, (chart) => <PieChartDisplay chart={chart} />)
  .with({ type: 'bar-chart' }, (chart) => <BarChartDisplay chart={chart} />)
  .with({ type: 'table' },     (chart) => <TableDisplay chart={chart} caption={card.title} />)
  .otherwise((scalar) => (
    <ShowcaseValue>{formatValue(scalar.data, card)}</ShowcaseValue>
  ))}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn nx test frontend -- AnalysisCard`
Expected: PASS for the four new table tests plus all pre-existing tests.

If the sort test fails because the `Trier par amount` button is not found, inspect `AdvancedTable.tsx:236-241` — the sort button title is `header.column.columnDef.meta?.sort?.title ?? \`Trier par ${header.id}\`` and the test relies on `header.id === 'amount'` (which matches the `id: meta.name` we set in `TableDisplay`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Analysis/TableDisplay.tsx frontend/src/components/Analysis/AnalysisCard.tsx frontend/src/components/Analysis/test/AnalysisCard.test.tsx
git commit -m "feat(front): render Metabase tables with AdvancedTable"
```

---

## Task 11: Final verification across the workspace

**Files:** none

- [ ] **Step 1: Run all typechecks**

Run: `yarn nx run-many -t typecheck`
Expected: PASS across `@zerologementvacant/models`, `@zerologementvacant/server`, and `@zerologementvacant/front`.

- [ ] **Step 2: Run all tests**

Run: `yarn nx run-many -t test --exclude=zero-logement-vacant`
Expected: PASS in models, server, and frontend.

- [ ] **Step 3: Run lint**

Run: `yarn nx run-many -t lint`
Expected: PASS (no new warnings).

- [ ] **Step 4: Push the branch and open the PR**

```bash
git push -u origin feat/metabase-dsfr-tables
gh pr create --title "feat: render Metabase tables in the Analysis page" --body "$(cat <<'EOF'
## Summary
- Add `TableCard` / `TableDataDTO` to the model layer; pre-resolve PM-curated columns server-side and surface them as a Metabase-agnostic shape.
- Render Metabase tables on the Analysis page using `AdvancedTable` with client-side sort, no pagination, and per-cell `fr-FR` formatting driven by Metabase `column_settings`.
- Refactor the dashboard controller's response dispatch from a fragile `typeof raw === 'object'` fallthrough into explicit branches keyed off `dashcard.type`.

## Test plan
- [ ] `yarn nx run-many -t typecheck` passes.
- [ ] `yarn nx test server -- dashboard-api` covers table dashcard listing and card-data (curated + fallback paths).
- [ ] `yarn nx test frontend -- AnalysisCard` covers header overrides, locale formatting, suffix, null cells, and click-to-sort.
- [ ] Manually verify a Metabase `table` dashcard renders in the Analyses view in dev.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Add the GitHub label and self-assign**

```bash
gh pr edit "$(gh pr view --json number -q .number)" --add-label "frontend" --add-label "backend" --add-assignee "@me"
```

(If those labels don't exist in the repo, run `gh label list` and pick the closest matches — e.g. `feature`, `analyse`.)

---

## Out of scope (explicit, do NOT implement)

- Pivot tables (`display === 'pivot'`).
- Server-side pagination.
- Row selection / export.
- Cell custom rendering (links, badges, conditional formatting via `column.formatting`).
- Column resizing / drag-reorder.
- Transcription accordion (`<table>` is already accessible; `caption` gives screen readers the section title).
