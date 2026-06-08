# Metabase bar charts — design spec

**Date:** 2026-06-08  
**Ticket:** [GEN-1409](https://app.notion.com/p/30b9ec2a056c801ead09d61a85addcef)  
**Branch:** `feat/metabase-dsfr-bar-charts`

---

## Goal

Add support for Metabase bar charts in the Analysis page, with an accessible text transcription (RGAA). The transcription is also added retroactively to pie charts.

---

## Architecture

Three layers are touched in the same order as the existing pie chart feature: `packages/models` → `server` → `frontend`.

---

## 1. Data model (`packages/models`)

**`DashboardDTO.ts`** additions:

```typescript
// Extend existing union
type CardType = 'flat-number' | 'percentage' | 'pie-chart' | 'bar-chart'

// Card metadata (no new fields beyond CardCommon)
interface BarChartCard extends CardCommon {
  type: 'bar-chart'
}

// Data DTO — direction is a rendering property, lives on the data response
interface BarChartDataDTO {
  id: number
  type: 'bar-chart'
  direction: 'horizontal' | 'vertical'
  labels: string[]
  data: number[]
}

// Updated unions
type DashboardCard = FlatNumberCard | PercentageCard | PieChartCard | BarChartCard
type CardDataDTO = ScalarCardDataDTO | PieChartDataDTO | BarChartDataDTO
```

**New fixtures** in `packages/models/src/test/fixtures.ts`:

- `genBarChartCard(override?)` — extends `CardCommon` pattern
- `genBarChartDataDTO(override?)` — generates 2–5 random label/value pairs with a random `direction`

---

## 2. Backend (`server`)

All changes in `src/services/metabase/metabase-api.ts`.

**`normalizeDashcard`** — detect both Metabase bar chart display types:

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
  }
}
```

**`DashcardRef`** — gains `direction: 'horizontal' | 'vertical'` (resolved at `findDashcard` time from `card.display`) so `getCardValue` can include it in the response without re-reading the raw display string.

**`getCardValue`** — bar chart rows have the same shape as pie chart rows (`[label, value]`):

```typescript
if (cardType === 'bar-chart') {
  return {
    direction: dashcard.direction,
    labels: data.data.rows.map((row) => String(row[0])),
    data: data.data.rows.map((row) => Number(row[1]))
  }
}
```

**`dashboardController.ts` — `findOneCard`** — maps the result to `BarChartDataDTO`, mirroring the pie chart branch.

No percentage detection for bar charts — not needed yet.

---

## 3. Frontend (`frontend`)

All changes in `src/components/Analysis/AnalysisCard.tsx`.

### `BarChartDisplay`

```typescript
import { BarChart } from '@codegouvfr/react-dsfr/Chart/BarChart'

function BarChartDisplay({ cardData }: Readonly<{ cardData: BarChartDataDTO }>) {
  return (
    <BarChart
      x={cardData.labels}
      y={cardData.data}
      horizontal={cardData.direction === 'horizontal'}
    />
  )
}
```

### `ChartTranscription` (new shared component)

An Accordion with a heading + bullet list. Used by both `PieChartDisplay` and `BarChartDisplay`.

- Accordion label: `"Transcription"` (fixed string)
- Accordion content: card `title` as a heading, followed by bullet list items
- **Pie chart**: `${label} : ${Math.round(value / total * 100)} %`
- **Bar chart**: `${label} : ${value}`

`ChartTranscription` receives `title`, `labels`, `data`, and `type` as props. The `title` is passed down from the `card` prop already available in `AnalysisCard`.

Uses `effect` (`Array`, `pipe`) and `ts-pattern` (`match(...).exhaustive()`):

```typescript
import { Array, pipe } from 'effect'
import { match } from 'ts-pattern'

const items = match(type)
  .with('pie-chart', () => {
    const total = pipe(data, Array.reduce(0, (acc, v) => acc + v))
    return pipe(
      Array.zip(labels, data),
      Array.map(([label, value]) => `${label} : ${Math.round(value / total * 100)} %`)
    )
  })
  .with('bar-chart', () =>
    pipe(Array.zip(labels, data), Array.map(([label, value]) => `${label} : ${value}`))
  )
  .exhaustive()
```

The `.exhaustive()` call ensures a compile error if a new chart type is added without updating the transcription.

### Dispatch in `AnalysisCard`

Replaces the existing ternary with `ts-pattern`:

```typescript
import { match } from 'ts-pattern'

{match(data)
  .with({ type: 'pie-chart' }, (d) => <PieChartDisplay cardData={d} />)
  .with({ type: 'bar-chart' }, (d) => <BarChartDisplay cardData={d} />)
  .otherwise((d) => <ShowcaseValue>{formatValue(d.data, card)}</ShowcaseValue>)}
```

---

## Testing

**`packages/models`**: no new test files — fixtures are covered by the existing fixture test suite.

**`server`** (`controllers/test/dashboard-api.test.ts`):
- Bar chart card appears in dashboard response when `card.display === 'bar'` or `'row'`
- `GET /dashboards/:did/cards/:cid` returns `BarChartDataDTO` with correct `direction`

**`frontend`** (`components/Analysis/test/AnalysisCard.test.tsx`):
- Renders `BarChart` when data type is `'bar-chart'`
- Transcription accordion is rendered for both pie and bar charts
- Pie chart transcription items use percentage format
- Bar chart transcription items use raw value format
- Direction prop (`horizontal`) is passed correctly to `BarChart`

---

## Out of scope

- Percentage detection for bar chart values
- Any other chart types (line, scatter, gauge, etc.)
- Vertical layout for pie charts
