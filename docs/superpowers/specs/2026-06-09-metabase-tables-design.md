# Metabase tables — design spec

**Date:** 2026-06-09
**Branch:** `feat/metabase-dsfr-tables`

---

## Goal

Add support for Metabase tables (`display === 'table'`) in the Analysis page, rendered via the existing `AdvancedTable` component. Columns and their order respect the PM's Metabase configuration (`table.columns`), and cells are formatted per-column using the column settings the PM already configures in Metabase (decimals, suffix, number style).

---

## Architecture

Three layers are touched in the same order as the pie/bar chart features: `packages/models` → `server` → `frontend`.

---

## 1. Data model (`packages/models`)

**`DashboardDTO.ts` additions:**

```typescript
// Extend existing union
export type CardType =
  | 'flat-number'
  | 'percentage'
  | 'pie-chart'
  | 'bar-chart'
  | 'table';

// Card metadata — no new fields beyond CardCommon
export interface TableCard extends CardCommon {
  type: 'table';
}

// Column metadata — what the frontend needs to render headers and format cells
export interface TableColumnMeta {
  name: string;          // raw Metabase column name (stable key)
  displayName: string;   // header label; falls back to name
  baseType: 'number' | 'string' | 'date' | 'boolean' | 'unknown';
  decimals?: number;     // from column_settings.decimals
  suffix?: string;       // from column_settings.suffix (e.g. " €", " %")
  numberStyle?: 'decimal' | 'percent' | 'currency' | 'scientific';
}

// Data DTO — parallel arrays, raw values
export interface TableDataDTO {
  id: number;
  type: 'table';
  columns: TableColumnMeta[]; // visible columns in display order
  rows: unknown[][];          // each row: values aligned to columns[]
}

// Updated unions
export type DashboardCard =
  | FlatNumberCard
  | PercentageCard
  | PieChartCard
  | BarChartCard
  | TableCard;

export type CardDataDTO =
  | ScalarCardDataDTO
  | PieChartDataDTO
  | BarChartDataDTO
  | TableDataDTO;
```

Notes:
- `baseType` is normalized from Metabase's `cols[i].base_type` (`type/BigInteger`, `type/Date`, …). The detector collapses Metabase's many numeric types (`Integer`, `BigInteger`, `Decimal`, `Float`) into a single `'number'`.
- Per-column `decimals`, `suffix`, `numberStyle` are only set when the PM configured them in `column_settings`; otherwise omitted.

**New fixtures in `packages/models/src/test/fixtures.ts`:**
- `genTableCard(override?)` — extends `CardCommon` pattern.
- `genTableColumnMeta(override?)` — random `name`, `displayName`, `baseType`.
- `genTableDataDTO(override?)` — generates 2–4 columns and 3–8 rows; row values match each column's `baseType` (numbers for `'number'`, words for `'string'`, ISO dates for `'date'`).

---

## 2. Backend (`server`)

All changes in `server/src/services/metabase/`.

### `metabase-api.ts` — `normalizeDashcard`

Detect tables alongside the existing pie/bar branches:

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

### `metabase-service.ts` — service types

```typescript
export type TableValue = {
  columns: TableColumnMeta[];
  rows: unknown[][];
};
export type CardValue = number | PieChartValue | BarChartValue | TableValue;
```

### `DashcardRef` — table-only field

Add an optional **pre-resolved** column list — _not_ the raw Metabase settings — to keep `metabase-service.ts` Metabase-agnostic (it currently imports only from `@zerologementvacant/models`):

```typescript
export interface TableColumnRef {
  name: string;
  columnTitle?: string;   // from column_settings.column_title
  decimals?: number;
  suffix?: string;
  numberStyle?: string;   // raw Metabase value; narrowed at the model boundary
}

export interface DashcardRef {
  // ...existing fields
  tableColumns: ReadonlyArray<TableColumnRef> | null;
}
```

`findDashcardRef` resolves PM-visible columns (via `table.columns`) and their `column_settings` into `tableColumns`. `getCardValue` then joins with `data.data.cols` (for `display_name` and `base_type`) and indexes rows. Other branches leave `tableColumns` `null`.

Fallback when `table.columns` is absent on a table dashcard: `findDashcardRef` sets `tableColumns: []`. `getCardValue` then treats an empty list as "use every column from the query result, in query order" — building `TableColumnRef`-equivalents on the fly from `data.data.cols`. Semantics: `null` = not a table dashcard; `[]` = table dashcard, no PM curation; non-empty = PM-curated list.

### `MetabaseService.getCardValue` — extended signature

Add an 8th param `tableColumns: ReadonlyArray<TableColumnRef> | null`, plumbed by the controller from `DashcardRef`, mirroring how `direction` was added for bar charts.

### `MetabaseColumnSettings` — extended

```typescript
interface MetabaseColumnSettings {
  number_style?: string;
  decimals?: number;
  suffix?: string;
  column_title?: string; // ← new
}
```

### `MetabaseCol` — extended

```typescript
interface MetabaseCol {
  name: string;
  display_name?: string;
  base_type?: string;
}
```

### `metabase-api.ts` — column resolution helper

```typescript
// Pick visible columns in PM-configured order; fall back to query cols when absent.
function resolveVisibleColumns(
  settings: MetabaseVisualizationSettings,
  cols: MetabaseCol[]
): { name: string; index: number }[] {
  const tableColumns = settings['table.columns'];
  if (tableColumns && tableColumns.length > 0) {
    return tableColumns
      .filter((c) => c.enabled)
      .map((c) => ({
        name: c.name,
        index: cols.findIndex((qc) => qc.name === c.name)
      }))
      .filter((c) => c.index !== -1); // drop names that don't appear in query result
  }
  return cols.map((c, index) => ({ name: c.name, index }));
}
```

### `metabase-api.ts` — base type normalizer

```typescript
function normalizeBaseType(
  metabaseType: string | undefined
): TableColumnMeta['baseType'] {
  if (!metabaseType) return 'unknown';
  if (/Integer|Decimal|Float|Number/.test(metabaseType)) return 'number';
  if (/Date|Time/.test(metabaseType)) return 'date';
  if (metabaseType.endsWith('Boolean')) return 'boolean';
  if (metabaseType.endsWith('Text') || metabaseType.endsWith('String')) return 'string';
  return 'unknown';
}
```

### `metabase-api.ts` — `getCardValue` table branch

```typescript
if (cardType === 'table') {
  // Join PM-resolved refs (name + settings) with query metadata (display_name + base_type).
  const columns: TableColumnMeta[] = tableColumns!.flatMap((ref) => {
    const index = data.data.cols.findIndex((c) => c.name === ref.name);
    if (index === -1) return [];
    const col = data.data.cols[index];
    return [{
      name: ref.name,
      displayName: ref.columnTitle ?? col.display_name ?? ref.name,
      baseType: normalizeBaseType(col.base_type),
      ...(ref.decimals !== undefined && { decimals: ref.decimals }),
      ...(ref.suffix !== undefined && { suffix: ref.suffix }),
      ...(ref.numberStyle !== undefined && {
        numberStyle: ref.numberStyle as TableColumnMeta['numberStyle']
      })
    }];
  });

  const indices = columns.map((c) =>
    data.data.cols.findIndex((qc) => qc.name === c.name)
  );
  const rows = data.data.rows.map((row) => indices.map((i) => row[i]));
  return { columns, rows };
}
```

`resolveVisibleColumns` from above is used inside `findDashcardRef` (against the dashboard endpoint) to build `TableColumnRef[]`; `getCardValue` is left to just join and index.

### `dashboardController.ts` — `findOneCard`

Map the service result to `TableDataDTO`, mirroring the bar-chart branch (`id`, `type: 'table'`, then `columns` / `rows`).

---

## 3. Frontend (`frontend`)

All changes in `src/components/Analysis/`.

### New file: `TableDisplay.tsx`

```typescript
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TableColumnMeta, TableDataDTO } from '@zerologementvacant/models';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';

interface TableDisplayProps {
  chart: TableDataDTO;
  caption: string; // card.title — used as the table's aria-label
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

  // Convert parallel arrays → objects keyed by column name, for tanstack's accessor model.
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

Why these knobs:
- `paginate={false}` — analysis tables are PM-curated summaries, not data grids.
- `enableSorting` — client-side sort on raw values, free from tanstack.
- `caption={card.title}` + `noCaption: true` — preserves DSFR padding while exposing the title to screen readers via `aria-label` (per the existing `AdvancedTable` contract).
- No row selection, no `getRowId`.

### Dispatch in `AnalysisCard.tsx`

Add one branch and align variable names — `chart` for the chart/table branches (each is a `*ChartDataDTO` or `TableDataDTO`), `scalar` for the scalar branch (`ScalarCardDataDTO`):

```typescript
import TableDisplay from './TableDisplay';

{match(data)
  .with({ type: 'pie-chart' }, (chart) => <PieChartDisplay chart={chart} />)
  .with({ type: 'bar-chart' }, (chart) => <BarChartDisplay chart={chart} />)
  .with({ type: 'table' },     (chart) => <TableDisplay chart={chart} caption={card.title} />)
  .otherwise((scalar) => <ShowcaseValue>{formatValue(scalar.data, card)}</ShowcaseValue>)}
```

No transcription accordion — a `<table>` is already an accessible textual structure, so `ChartTranscription` would be redundant. The `caption` prop gives screen readers the section title.

---

## Testing

**`packages/models`:** no new test files — fixtures are covered by the existing fixture test suite.

**`server` (`controllers/test/dashboard-api.test.ts`):**
- Table card appears in dashboard response when `card.display === 'table'`.
- `GET /dashboards/:did/cards/:cid` returns `TableDataDTO`.
- Respects `table.columns`: disabled columns filtered out, order preserved.
- Falls back to query `cols` order when `table.columns` is absent.
- Column `displayName` prefers `column_settings.column_title`, then `col.display_name`, then `name`.
- `baseType` normalizes Metabase `type/BigInteger`, `type/Date`, etc. correctly.
- `decimals` / `suffix` / `numberStyle` only included when present in `column_settings`.

**`frontend` (`components/Analysis/test/AnalysisCard.test.tsx`):**
- Renders `AdvancedTable` when data type is `'table'`.
- Headers use `column.displayName`.
- Numeric cells formatted with `fr-FR` locale (thousand separators).
- Cells with `numberStyle: 'percent'` formatted as percentages.
- Cells with `suffix` (e.g. ` €`) get the suffix appended (when not percent).
- Date cells formatted as `fr-FR` dates.
- `null` / `undefined` cells render empty string.
- `caption` prop receives `card.title`.
- Sort works on a numeric column.

---

## Out of scope

- Pivot tables (`display === 'pivot'`).
- Server-side pagination.
- Row selection / export.
- Cell custom rendering (links, badges, conditional formatting via `column.formatting`).
- Column resizing / drag-reorder.
- Transcription accordion (`<table>` is already accessible).
