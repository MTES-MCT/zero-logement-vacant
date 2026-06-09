# Metabase line charts — design spec

**Date:** 2026-06-09
**Branch:** `feat/metabase-dsfr-line-charts`

---

## Goal

Add support for Metabase line charts in the Analysis page, single-series only, with an accessible text transcription (RGAA). Mirrors the existing pie and bar chart features.

---

## Architecture

Three layers are touched in the same order as the existing pie and bar chart features: `packages/models` → `server` → `frontend`.

---

## 1. Data model (`packages/models`)

**`DashboardDTO.ts`** additions:

```typescript
// Extend existing union
type CardType = 'flat-number' | 'percentage' | 'pie-chart' | 'bar-chart' | 'line-chart'

// Card metadata (no new fields beyond CardCommon)
interface LineChartCard extends CardCommon {
  type: 'line-chart'
}

// Data DTO — no direction; line charts are always plotted along a horizontal x-axis
interface LineChartDataDTO {
  id: number
  type: 'line-chart'
  labels: string[]
  data: number[]
}

// Updated unions
type DashboardCard = FlatNumberCard | PercentageCard | PieChartCard | BarChartCard | LineChartCard
type CardDataDTO   = ScalarCardDataDTO | PieChartDataDTO | BarChartDataDTO | LineChartDataDTO
```

**New fixtures** in `packages/models/src/test/fixtures.ts`:

- `genLineChartCard(override?)` — mirrors `genBarChartCard`
- `genLineChartDataDTO(override?)` — generates 2–5 random label/value pairs

---

## 2. Backend (`server`)

All changes in `src/services/metabase/metabase-api.ts`, `src/services/metabase/metabase-service.ts`, and `src/controllers/dashboardController.ts`.

**`metabase-service.ts`** — add value type:

```typescript
export type LineChartValue = { labels: string[]; data: number[] }
export type CardValue = number | PieChartValue | BarChartValue | LineChartValue
```

**`normalizeDashcard`** — detect the Metabase line chart display type:

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
  }
}
```

**`findDashcardRef`** — line-chart branch sets `valueColumn: null`, `direction: null`. No `direction` resolution is needed.

**`getCardValue`** — line chart rows have the same shape as pie chart rows (`[label, value]`):

```typescript
if (cardType === 'line-chart') {
  return {
    labels: data.data.rows.map((row) => String(row[0])),
    data: data.data.rows.map((row) => Number(row[1]))
  }
}
```

**`dashboardController.ts` — `findOneCard`** — adds a `'line-chart'` branch mapping the result to `LineChartDataDTO`, mirroring the bar chart branch but without `direction`.

No percentage detection for line charts — not needed yet.

---

## 3. Frontend (`frontend`)

### `LineChartDisplay` (new, `src/components/Analysis/LineChartDisplay.tsx`)

```typescript
import { LineChart } from '@codegouvfr/react-dsfr/Chart/LineChart'
import type { LineChartDataDTO } from '@zerologementvacant/models'

import ChartTranscription from './ChartTranscription'

interface LineChartDisplayProps {
  chart: LineChartDataDTO
}

function LineChartDisplay(props: Readonly<LineChartDisplayProps>) {
  const { chart } = props
  return (
    <>
      <LineChart x={chart.labels} y={chart.data} color="blue-france" />
      <ChartTranscription labels={chart.labels} data={chart.data} type="line-chart" />
    </>
  )
}

export default LineChartDisplay
```

Note: DSFR `LineChart` takes flat arrays (`x: any[]`, `y: number[]`, single `color: ChartColor`) — *not* the nested arrays that `BarChart` uses.

### `ChartTranscription` — add a `'line-chart'` arm

The same raw-value format as bar charts:

```typescript
.with('line-chart', () =>
  pipe(Array.zip(labels, data), Array.map(([label, value]) => `${label} : ${value}`))
)
```

The `type` prop union widens to `'pie-chart' | 'bar-chart' | 'line-chart'`. The existing `.exhaustive()` call guarantees a compile error if the arm is missing.

### Dispatch in `AnalysisCard`

Add the line-chart arm to the existing `match`:

```typescript
{match(data)
  .with({ type: 'pie-chart' },  (d) => <PieChartDisplay  chart={d} />)
  .with({ type: 'bar-chart' },  (d) => <BarChartDisplay  chart={d} />)
  .with({ type: 'line-chart' }, (d) => <LineChartDisplay chart={d} />)
  .otherwise((d) => <ShowcaseValue>{formatValue(d.data, card)}</ShowcaseValue>)}
```

---

## Testing

**`packages/models`**: no new test files — fixtures are covered by the existing fixture test suite.

**`server`** (`controllers/test/dashboard-api.test.ts`):
- Line chart card appears in dashboard response when `card.display === 'line'`
- `GET /dashboards/:did/cards/:cid` returns `LineChartDataDTO` with correct labels/data

**`frontend`** (`components/Analysis/test/AnalysisCard.test.tsx`):
- Renders `LineChart` when data type is `'line-chart'`
- Transcription accordion is rendered for line charts using the raw value format

---

## Out of scope

- Multi-series line charts (DSFR `MultiLineChart`)
- `display === 'area'`
- Percentage formatting on line values
- Any other chart types (scatter, gauge, radar, etc.)
