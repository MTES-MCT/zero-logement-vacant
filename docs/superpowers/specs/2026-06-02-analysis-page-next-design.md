# Analysis Page Next — Design Spec

**Date:** 2026-06-02  
**Branch:** feat/metabase-dsfr-charts  
**Feature flag:** `new-analysis-page` (PostHog)

## Context

The current `AnalysisView` renders Metabase dashboards in an `<iframe>` via a signed JWT embed URL. This approach prevents DSFR branding and blocks accessibility (iframes are opaque to screen readers). The goal is to render chart data natively in the React app, behind a feature flag, while keeping the old code path working until the flag is removed.

Metabase is self-hosted open-source — the Embedded Analytics SDK is not available (Pro/Enterprise only). The approach is to proxy the Metabase API through the ZLV backend using `METABASE_API_TOKEN`.

---

## Models (`packages/models`)

### `DashboardDTO`

Replaces the current `{ url: string }` shape. `url` is kept temporarily so both the old `AnalysisView` (reads `url`) and the new `AnalysisViewNext` (reads `tabs`/`cards`) can share the same endpoint during the feature flag transition.

```typescript
import type { IntClosedRange, NonNegativeInteger } from 'type-fest'

export type CardType = 'flat-number' | 'percentage'

export interface CardCommon {
  id: number                        // dashcard_id (Metabase placement ID)
  type: CardType
  title: string
  description: string | null
  decimals: number                  // from card visualization_settings, resolved at dashboard fetch
  position: {
    col: IntClosedRange<0, 23>      // 0-indexed, 24-column grid
    row: NonNegativeInteger
  }
  size: {
    width: IntClosedRange<1, 24>
    height: NonNegativeInteger
  }
}

export interface FlatNumberCard extends CardCommon { type: 'flat-number' }
export interface PercentageCard extends CardCommon { type: 'percentage' }
export type DashboardCard = FlatNumberCard | PercentageCard

interface Tab {
  id: number
  title: string
  cards: ReadonlyArray<DashboardCard>
}

interface WithTabs    { tabs: ReadonlyArray<Tab> }
interface WithoutTabs { cards: ReadonlyArray<DashboardCard> }

// url is transitional — remove when feature flag is deleted
export type DashboardDTO = { id: number; url: string } & (WithTabs | WithoutTabs)
```

### `CardDataDTO`

Returned by the per-card data endpoint. `decimals` lives on `CardCommon` (metadata), so this shape is intentionally minimal.

```typescript
export interface CardDataDTO {
  id: number    // dashcard_id, mirrors CardCommon.id
  data: number
}
```

---

## Backend

### `GET /dashboards/:id` (updated)

- `:id` remains a `Resource` slug (e.g. `'13-analyses'`) — validation unchanged for backward compat
- Now calls **two** Metabase endpoints in addition to the existing JWT generation:
  1. `GET {metabase.domain}/api/dashboard/{numericId}` with `Authorization: Bearer {apiToken}`
  2. Normalizes `ordered_tabs` / `dashcards` into `WithTabs | WithoutTabs`
- Returns merged `DashboardDTO` with both `url` (existing) and `tabs`/`cards` (new)

**Type mapping from Metabase response:**
- `dashcard.card.display !== 'scalar'` → filtered out entirely
- `scalar` + `visualization_settings['number.style'] === 'percent'` (or `column_settings[key].number_style === 'percent'`) → `'percentage'`
- `scalar` otherwise → `'flat-number'`
- `decimals`: from `visualization_settings['scalar.decimals']` or `column_settings[key].decimals`, defaulting to `0`

**Tab normalization:**
- `ordered_tabs` non-empty → `WithTabs`, each tab's `ordered_cards` mapped
- `ordered_tabs` empty or absent → `WithoutTabs`, top-level `dashcards` mapped

> **Implementation note:** Exact Metabase field names for tabs (`ordered_tabs` vs `tabs`) and top-level cards (`dashcards` vs `ordered_cards`) must be verified against the live instance when implementing.

### `GET /dashboards/:did/cards/:cid` (new)

- `:did` accepts either a `Resource` slug **or** a numeric dashboard ID
- `:cid` is a numeric `dashcard_id`
- Flow:
  1. Re-fetches `GET /api/dashboard/{numericDid}` to resolve `card_id` from the dashcard (acceptable; Metabase caches this)
  2. Calls `POST /api/dashboard/{numericDid}/dashcard/{cid}/card/{card_id}/query` with the establishment filter parameter (`auth.establishmentId`)
  3. Extracts scalar value from `response.data.rows[0][0]`
  4. Returns `CardDataDTO { id: cid, data: value }`
- Returns `404` if dashcard not found or not a supported type
- Returns `502` if Metabase is unreachable

**Confirmed Metabase query response shape** (from live instance):
```json
{
  "data": {
    "rows": [[51884]],
    "cols": [{ "semantic_type": "type/Quantity", ... }]
  },
  "status": "completed"
}
```

---

## Frontend

### Feature flag

Add `'new-analysis-page'` to the `AvailableFeatureFlag` union in `FeatureFlagLayout.tsx`. The flag is managed in PostHog. `VITE_FEATURE_FLAGS` remains a local dev fallback only.

### Routing (`App.tsx`)

Existing routes are untouched. Each analysis route gets a `FeatureFlagLayout` wrapper:

```tsx
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
// Same pattern for /analyses/lutte → id="15-analyses-activites"
```

### `dashboard.service.ts`

Two new RTK Query endpoints added alongside the existing `findOneDashboard` (untouched):
- `findOneDashboardNext` — `GET /dashboards/:id` returning new `DashboardDTO`
- `findOneCard` — `GET /dashboards/:did/cards/:cid` returning `CardDataDTO`

### `AnalysisViewNext.tsx` (`views/Analysis/`)

- Accepts `id: Resource` (slug, e.g. `'13-analyses'`) — same as `AnalysisView`, so routes are symmetric
- `DashboardDTO.id` (numeric) is then used as `:did` for subsequent `findOneCard` calls
- Calls `findOneDashboardNext`
- `WithTabs` → DSFR `Tabs` component, each tab renders a card grid
- `WithoutTabs` → card grid directly
- Dashboard-level loading: full-area skeleton
- Dashboard-level error: DSFR `Alert` with `severity="error"`

### Card grid

CSS Grid, 24 columns. Each card placed via:
```css
grid-column: {card.position.col + 1} / span {card.size.width};
grid-row:    {card.position.row + 1} / span {card.size.height};
```
This maps directly from Metabase's coordinate system with no translation.

### `components/Analysis/AnalysisCard.tsx`

Smart component — owns its own data fetch. Accepts `card: DashboardCard` and `dashboardId: number | Resource`.

Three render states:
- **Loading** → MUI `Skeleton` sized to match the card's grid cell
- **Error** → inline DSFR `Alert` with `severity="error"`
- **Data** → title, formatted value, description (if present)

Value formatting via `Intl.NumberFormat`:
- `'flat-number'` → `{ maximumFractionDigits: card.decimals }`
- `'percentage'` → `{ style: 'percent', maximumFractionDigits: card.decimals }`

Test: `components/Analysis/test/AnalysisCard.test.tsx`

---

## What's explicitly out of scope

- Bar charts, histograms, line charts — dashcards with `display !== 'scalar'` are silently filtered out
- Admin UI for configuring which dashboards/cards appear — dashboard IDs are hard-coded per route
- Batch card data fetching — N parallel requests are acceptable for scalar-only cards

---

## Migration path

When `new-analysis-page` flag is permanently enabled and the old `AnalysisView` is deleted:
1. Remove `url` from `DashboardDTO`
2. Remove `findOneDashboard` from `dashboard.service.ts`
3. Remove `getResource()` JWT logic from `dashboardController.ts`
4. Remove `AvailableFeatureFlag` entry and `FeatureFlagLayout` wrappers in `App.tsx`
