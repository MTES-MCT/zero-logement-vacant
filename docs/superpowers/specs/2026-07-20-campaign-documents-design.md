# Campaign Documents — Design

Notion ticket: GEN-1428 — [Campagnes] Ajouter l'onglet Documents
Figma: node 16628:13904 ("Campagne - Importer ses courriers")

## Problem

Campaigns have no way to attach supporting documents (courrier templates,
formulaires, fiches de renseignement, flyers, fiches RGPD, etc.). The Notion
ticket asks for a "Documents" tab on the campaign detail page, matching how
documents already display on a housing's detail page: upload one or more
files, see them immediately attached, and browse them as a grid of cards.

The housing-documents feature (generic `documents` table + S3 storage +
`documents_housings` junction + full frontend upload/list/rename/delete UI)
already exists end-to-end in production. This feature extends that same
generic infrastructure to campaigns rather than building anything new from
scratch.

## Goals

- Add a "Documents" tab to the campaign detail page (`CampaignView.tsx`),
  positioned after "Destinataires" and "Courrier", matching the Figma order.
- Let a user upload one or more documents to a campaign; they are created and
  attached immediately (single user action), matching the ticket's spec.
- Display attached documents the same way housing documents are displayed:
  thumbnail/preview, filename, type + size, an Options menu
  (Visualiser/Renommer/Télécharger/Supprimer).
- Reuse the existing generic document infrastructure (S3 storage, upload
  validation, DTOs, frontend components) rather than duplicating it.
- Centralize the one meaningful piece of duplicated permission logic
  (`DocumentCard`'s inline write-check) into a single shared function.

## Non-goals

- Pagination of the campaign document list — housing documents don't
  paginate either; out of scope until a real need appears.
- A visible audit/history UI for campaign document events — the event
  tables are added for traceability parity with housing, but no timeline
  component is wired up for campaigns today (none exists for campaigns at
  all yet).
- Changing who can access campaigns overall, or introducing a per-document
  ownership/ACL model — the existing flat, establishment-scoped + role-based
  permission model is preserved as-is, just applied to campaigns too.
- URL-based deep-linking to a specific tab — the existing `Tabs` usage on
  this page is uncontrolled (no tab is reflected in the URL today); this
  feature doesn't change that.

## Approach

Many-to-many junction table (`documents_campaigns`), mirroring the existing
`documents_housings` pattern 1:1, per the codebase's own extension guide
(`docs/guides/document-upload-architecture.md`, "Extending to Other Domains
→ Adding Campaign Documents"). The generic `documents` table remains
entity-agnostic; campaigns get their own junction + event tables, repository,
controller methods, and routes, all copy-adapted from the housing
equivalents.

### Alternatives considered

- **Direct FK `documents.campaign_id`** (mirrors `senders.signatory_one_document_id`):
  less code short-term, but makes `documents` entity-aware, breaks symmetry
  with housing's many-to-many model (two different linking mechanics to
  remember per entity), and forecloses documents ever being shared across
  campaigns without a migration. Rejected.
- **Denormalized document-ID array on `campaigns`**: no new table, but no FK
  integrity, no cascade delete, no reverse lookup, and a total break from
  every existing linking pattern in the codebase. Rejected outright.

## Architecture

### Data model

Two new migrations (timestamped per existing convention), both mirroring
the housing-document migrations:

**`documents_campaigns`** (junction table):

```sql
CREATE TABLE documents_campaigns (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, campaign_id)
);
CREATE INDEX ON documents_campaigns (campaign_id);
```

**`campaign_document_events`** (audit trail, mirrors `housing_document_events`):

```sql
CREATE TABLE campaign_document_events (
  event_id UUID PRIMARY KEY REFERENCES events(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id)
);
```

**Constant rename** (`packages/models`): `ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS`
and `MAX_HOUSING_DOCUMENT_SIZE_IN_MiB` move out of `HousingDocumentDTO.ts`
into `DocumentDTO.ts` as entity-agnostic `ACCEPTED_DOCUMENT_EXTENSIONS` /
`MAX_DOCUMENT_SIZE_IN_MiB` (values unchanged: 25 MiB, same format list).
`HousingDocumentDTO.ts` keeps only its `HousingDocumentDTO` type alias. Every
existing usage is updated to the renamed import — this is a mechanical
rename, not a behavior change, and the Figma spec for campaign uploads uses
identical limits so no divergent campaign-specific constants are needed.

**New DTOs / models**:

- `packages/models/src/CampaignDocumentDTO.ts` — `export type CampaignDocumentDTO = DocumentDTO;`
  (mirrors `HousingDocumentDTO.ts`).
- `server/src/models/CampaignDocumentApi.ts` — `CampaignDocumentApi extends DocumentApi { campaignId }`,
  `toCampaignDocumentDTO()` (mirrors `HousingDocumentApi.ts`).
- `server/src/models/EventApi.ts` — add `CampaignDocumentEventApi` union member
  (`campaign:document-attached | campaign:document-detached | campaign:document-removed`),
  mirroring `HousingDocumentEventApi`.

**Schema**: `packages/schemas/src/campaign-document-payload.ts` —
`{ documentIds: string[] }` (mirrors `housing-document-payload.ts`), exported
as `schemas.campaignDocumentPayload`, with the same `@fast-check/vitest`
property-based test coverage.

### Shared permission helper

The generic role check (`isAdmin`/`isUsual`) is already centralized in the
`useUser()` hook; the only place a compound rule is written inline today is
`DocumentCard.tsx:70` — `isAdmin || (isUsual && sameEstablishment)`. Since
`DocumentCard` is reused verbatim for campaign documents (no new frontend
call site), this is extracted once:

```ts
// packages/models/src/DocumentDTO.ts (or an adjacent file)
export function canWriteDocument(
  role: UserRole,
  sameEstablishment: boolean
): boolean {
  return (
    role === UserRole.ADMIN || (role === UserRole.USUAL && sameEstablishment)
  );
}
```

`DocumentCard.tsx` calls this in place of its inline expression. The backend
`hasRole([UserRole.USUAL, UserRole.ADMIN])` middleware is a different shape
(Express middleware vs. pure predicate) and establishment-scoping there is
already enforced structurally via repository query filters — full
unification isn't practical, so the backend keeps its existing mechanism.
This is a residual, accepted duplication, called out explicitly rather than
hidden: if the role rule ever changes, both `canWriteDocument` and the
`hasRole([...])` call sites need updating together.

### Backend chain

**Repository** — `server/src/repositories/campaignDocumentRepository.ts`,
mirrors `housingDocumentRepository.ts` with a simpler 2-column composite key
(no geo-code): `link`, `linkMany` (idempotent, `ON CONFLICT DO NOTHING`),
`unlink`, `unlinkMany`, `find`, `get`, `remove`.

**Controller** — extend `server/src/controllers/documentController.ts` with
three new handlers, mirroring `linkToHousing` / `listByHousing` /
`removeByHousing` line-for-line:

- `linkToCampaign` — validates the campaign exists and belongs to the
  establishment (`campaignRepository.findOne({ id, filters: { establishmentId } })`),
  validates the referenced documents exist and belong to the establishment,
  inserts junction rows via `campaignDocumentRepository.linkMany`, emits
  `campaign:document-attached` events.
- `listByCampaign` — validates the campaign, returns all linked documents
  with fresh pre-signed URLs.
- `removeByCampaign` — unlinks only (keeps the underlying document, matching
  `removeByHousing`), emits `campaign:document-detached`.

`create` / `update` / `remove` (the entity-agnostic document CRUD) are
untouched — campaign uploads hit the same `POST /documents` endpoint housing
uploads already use, just now configured with the renamed generic constants.
`remove`'s existing cascade-cleanup logic (S3 delete, unlink from all
parents, `document:removed` event) is extended to also unlink and emit
`campaign:document-removed` for any linked campaigns, mirroring what it
already does for linked housings.

**Router** (`server/src/routers/protected.ts`), same shape as the housing
routes:

```ts
router.get(
  '/campaigns/:id/documents',
  validator.validate({ params: object({ id: schemas.id }) }),
  documentController.listByCampaign
);

router.post(
  '/campaigns/:id/documents',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.campaignDocumentPayload
  }),
  documentController.linkToCampaign
);

router.delete(
  '/campaigns/:id/documents/:documentId',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id, documentId: schemas.id })
  }),
  documentController.removeByCampaign
);
```

### Frontend

**New components**:

- `frontend/src/components/FileUpload/CampaignDocumentUpload.tsx` — mirrors
  `HousingDocumentUpload.tsx`: campaign-specific label ("Associez un ou
  plusieurs documents à cette campagne") + hint text over the shared
  `DocumentUpload` + `useDocumentUpload` primitives, using the renamed
  generic constants.
- `frontend/src/components/Campaign/CampaignDocumentsTab.tsx` — mirrors
  `HousingDetails/DocumentsTab.tsx`: upload header (gated by
  `isAdmin || isUsual`), empty state ("Il n'y a pas de document associé à
  cette campagne"), grid of `DocumentCard`s under a "Documents (N)" heading,
  wires up `DocumentDeleteModal` / `DocumentRenameModal` /
  `DocumentFullscreenPreview`. No pagination.
- `DocumentCard.tsx` — one-line change: inline `canWrite` expression becomes
  a call to `canWriteDocument(role, sameEstablishment)`. Otherwise unchanged,
  reused as-is for both housing and campaign documents.

**RTK Query** (`frontend/src/services/document.service.ts`, extending the
existing `documentApi`):

- `useFindCampaignDocumentsQuery(campaignId)` → `GET /campaigns/:id/documents`
- `useLinkDocumentsToCampaignMutation()` → `POST /campaigns/:id/documents { documentIds }`
- `useUnlinkCampaignDocumentMutation()` → `DELETE /campaigns/:id/documents/:documentId`,
  same optimistic cache-patch pattern as `useUnlinkDocumentMutation`.
- `useUploadDocumentsMutation` / `useUpdateDocumentMutation` /
  `useDeleteDocumentMutation` reused unchanged (already entity-agnostic).

**Wiring into `CampaignView.tsx`**: add a third, lazy-loaded tab after
Destinataires and Courrier:

```tsx
const CampaignDocumentsTabLazy = lazy(() => import('~/components/Campaign/CampaignDocumentsTab'));
// ...
tabs={[
  { label: 'Destinataires', content: <CampaignRecipientsNext campaign={campaign} /> },
  { label: 'Courrier', content: /* existing DraftForm branch */ },
  { label: 'Documents', content: <CampaignDocumentsTabLazy campaign={campaign} /> }
]}
```

No URL sync — matches the existing uncontrolled `Tabs` usage on this page.

**MSW mocks**: extend `frontend/src/mocks/handlers/document-handlers.ts`
with campaign-scoped handlers against a new `data.campaignDocuments` map,
alongside the existing `data.housingDocuments`.

## Testing strategy (TDD, mandatory)

Backend order per `.claude/rules/backend-conventions.md`: Router → Controller
test → Controller → Repository test → Repository.

- `packages/schemas/src/test/campaign-document-payload.test.ts` — property-based,
  mirrors `housing-document-payload.test.ts`.
- `packages/models/src/test/*.test.ts` — unit test for `canWriteDocument`:
  ADMIN (any establishment) → true; USUAL + same establishment → true;
  USUAL + different establishment → false; VISITOR → false.
- `server/src/models/test/CampaignDocumentApi.test.ts` — mirrors
  `DocumentApi.test.ts` (DTO conversion, pre-signed URL generation).
- `server/src/repositories/test/campaignDocumentRepository.test.ts` —
  mirrors `housingDocumentRepository.test.ts`: link / idempotent linkMany /
  unlink / unlinkMany / find / get / remove, asserted via primitive table
  accessors.
- `server/src/controllers/test/campaign-document-api.test.ts` (supertest) —
  `GET/POST /campaigns/:id/documents`, `DELETE /campaigns/:id/documents/:documentId`:
  success paths, campaign/document not-found or wrong-establishment (404),
  role gate (403 for `VISITOR`), event rows asserted via primitive accessors.
- `frontend/src/components/FileUpload/test/CampaignDocumentUpload.test.tsx`
  and `frontend/src/components/Campaign/test/CampaignDocumentsTab.test.tsx` —
  loading/empty/populated states, upload/rename/delete flows, permission
  gating across `USUAL`/`ADMIN`/`VISITOR` and cross-establishment, via MSW
  (never `vi.mock` for network data).
- Extend `frontend/src/views/Campaign/test/CampaignView.test.tsx` with a
  view-level integration test for the full Documents tab flow (click tab →
  upload zone + existing docs visible → upload → appears in list → rename →
  delete), following the `GroupViewNext.test.tsx` pattern.
- `DocumentCard.test.tsx` — quick regression pass since `canWrite` now
  delegates to the shared helper; same behavior expected.

### RGAA note

This feature reuses `DocumentCard`, `DocumentsTab`'s structure,
`DocumentUpload`, and the DSFR `Tabs`/`Dropdown` components as-is (already
accessible in production for housing) — no new interactive pattern is
introduced. The new campaign-specific files are thin wiring/label wrappers.
Thématiques 7 (Dropdown/focus handling) and 11 (upload zone as a form
control) will be re-verified against the reused components once wired into
the campaign context; anything unexpected will be flagged explicitly.

## Risks & trade-offs

- **Cross-cutting rename** — renaming `ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS`/
  `MAX_HOUSING_DOCUMENT_SIZE_IN_MiB` touches existing housing-document call
  sites (controller, router, `HousingDocumentUpload.tsx`, tests). Mechanical
  and low-risk (same values, just renamed), but every call site must be
  updated in the same change to avoid a broken import.
- **Residual permission duplication** — the backend's `hasRole([...])` gate
  and the new `canWriteDocument` frontend helper encode the same rule via
  different mechanisms and aren't automatically kept in sync. Accepted and
  documented rather than solved, since the two systems (Express middleware
  vs. pure predicate) aren't practically unifiable here.
- **No campaign event history UI yet** — `campaign_document_events` rows are
  written for traceability but have no visible timeline consumer today,
  matching the current state of campaign events generally.

## Implementation order (TDD)

1. `packages/models`: rename constants to generic names, add `CampaignDocumentDTO`,
   add `canWriteDocument`. Add/update unit tests first.
2. `packages/schemas`: add `campaignDocumentPayload` + property-based tests.
3. Migrations: `documents_campaigns`, `campaign_document_events`.
4. Backend: repository test → `campaignDocumentRepository.ts`; controller
   test → `documentController.ts` additions; router wiring in `protected.ts`.
5. Frontend: `document.service.ts` endpoints + MSW handlers →
   `CampaignDocumentUpload.tsx` → `CampaignDocumentsTab.tsx` (tests first for
   each) → wire into `CampaignView.tsx`.
6. Verify: manual pass against the Figma screenshot (upload, list, rename,
   delete, permission gating) + full test suite + RGAA re-check on reused
   interactive components.
