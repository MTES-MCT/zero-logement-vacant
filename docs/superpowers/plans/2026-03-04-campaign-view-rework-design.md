# Campaign View Rework — Design

**Date:** 2026-03-04
**Branch:** `feat/campaigns-rework-campaign-view`
**Scope:** fullstack

---

## Context

The campaign view is being reworked from scratch. The new design uses a single unified layout regardless of campaign status (`draft`, `sending`, `in-progress`, `archived`). The entry point is `CampaignViewNext.tsx` (currently a stub).

---

## 1. Data Model

### `packages/models` — `CampaignDTO`
- Add `returnCount: number | null`
  - `null` = no `sentAt` set yet (not computable)
  - `number` = computed value from DB trigger

### `genCampaignDTO` fixture
- Add `returnCount: null` as default

---

## 2. Backend

### Migration: `20260304_campaigns-add-return-count.ts`
- Add `return_count INTEGER NOT NULL DEFAULT 0` to `campaigns` table
- Create two PL/pgSQL triggers (see `docs/database/triggers.md` for full documentation)

**No new indexes needed** — all required indexes already exist:
- `campaigns_housing (housing_geo_code, housing_id)` — migration `20250611064718`
- `housing_events (housing_geo_code, housing_id)` — migration `20250716150612`
- `events (type, created_at)` — migration `20250716132616`

### Campaign repository
- Map `return_count` → `returnCount` in `fromCampaignDBO`
- Expose `returnCount: null` when `sentAt` is null (column value is 0 but semantically meaningless)

### Feature flag: `POST /campaigns`
- Install `posthog-node` in server workspace
- In campaign router: check flag `new-campaigns` for the requesting establishment
- If enabled → return `404 Not Found`
- Uses async flag evaluation inside the route handler

---

## 3. Frontend

### Route wiring (`App.tsx`)
- Wrap campaign route with `FeatureFlagLayout` (`new-campaigns` flag):
  - `then`: `<CampaignViewNext />`
  - `else`: `<CampaignView />` (existing)

### `CampaignViewNext` layout

**Header row:**
- DSFR `Breadcrumb`: Campagnes > [campaign.title]
- Title + "Modifier" inline button (reuse `CampaignTitle`)
- "Supprimer la campagne" button → calls `useRemoveCampaignMutation` → navigates to `/campagnes`

**Info block:**
- "Description" label + description text
- "Cette campagne a été créée depuis le groupe [link] le [date] par [user]" (reuse `CampaignCreatedFromGroup`)

**Metrics strip (5 stat cards):**
| Card | Content |
|------|---------|
| Nombre de logements | building icon + count |
| Nombre de propriétaires | group icon + count |
| Date d'envoi | if null → "Indiquer la date d'envoi" button (opens modal); if set → formatted date + icon-button to re-open modal |
| Nombre de retours | if `sentAt` null → "En attente de la date d'envoi" + tooltip; else `returnCount` |
| Taux de retour | if `sentAt` null → same waiting state + tooltip; else `Math.round(returnCount / housingCount * 100) + '%'` |

**"Indiquer la date d'envoi" modal:**
- DSFR Modal with DSFR date input
- "Annuler" (secondary) / "Confirmer" (primary)
- On confirm → calls `useUpdateCampaignMutation` with `sentAt` set
- Reusable for both initial set and re-edit

**Tabs (DSFR `Tabs`):**
1. "Destinataires" → `<CampaignRecipients campaign={campaign} />`
2. "Courrier" → draft editor (lifted from `CampaignDraft`, keeping all existing logic)

### New components
- `CampaignSentAtModal` — the date modal (standalone, controlled via DSFR `createModal`)
- `CampaignStatCard` — reusable stat card (icon + label + value/action)

---

## 4. Testing

### Backend
- Controller test: `POST /campaigns` returns 404 when flag enabled
- Repository test: `returnCount` is mapped correctly from DB

### Frontend
- Unit tests for `CampaignStatCard` and `CampaignSentAtModal`
- View-level integration test in `views/Campaign/test/CampaignViewNext.test.tsx` covering:
  - Header renders with title and breadcrumb
  - "Supprimer" navigates to `/campagnes`
  - "Indiquer la date d'envoi" opens modal and submits
  - Metrics show waiting state when `sentAt` is null
  - Metrics show values when `sentAt` is set
