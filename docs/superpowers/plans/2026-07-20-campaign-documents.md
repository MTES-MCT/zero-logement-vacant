# Campaign Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Documents" tab to the campaign detail page so users can upload, view, rename, and delete documents attached to a campaign — mirroring the existing housing-documents feature.

**Architecture:** Reuse the existing generic `documents` table/S3 infrastructure. Add a `documents_campaigns` many-to-many junction table (mirrors `documents_housings`), a `campaignDocumentRepository`, three new `documentController` methods, three new routes, and a self-contained `CampaignDocumentsTab` React component wired into `CampaignView.tsx`'s existing DSFR `Tabs`. Reuse `DocumentCard`, `DocumentUpload`, `DocumentFullscreenPreview`, `DocumentDeleteModal`, `DocumentRenameModal` unchanged (all already entity-agnostic).

**Tech Stack:** TypeScript, Express, Knex/PostgreSQL, S3-compatible storage, React, RTK Query, DSFR + MUI, Vitest, MSW, supertest.

Design spec: `docs/superpowers/specs/2026-07-20-campaign-documents-design.md`

## Global Constraints

- TDD is mandatory: write the failing test before the implementation, for every step below.
- Backend order per `.claude/rules/backend-conventions.md` is Router → Controller test → Controller → Repository test → Repository. **Deviation, stated explicitly**: this plan implements the Repository before the Controller/Router, because the controller integration tests exercise the real repository against the test database (no mocking) and cannot compile or pass until it exists. Within the combined Controller+Router task, the router and controller test are still written before the controller implementation.
- Run `yarn nx run-many -t typecheck` after any change to `packages/models` or `packages/schemas` (per `.claude/rules/packages-conventions.md`).
- Run tests via `yarn nx test <project> -- <file-pattern>` from the repo root — never `yarn test` inside a workspace.
- All user-facing French strings use the French apostrophe `’` (U+2019), never `'`.
- Frontend: DSFR components first, MUI layout primitives second, Emotion `styled()` third. Direct MUI imports only (`import Box from '@mui/material/Box'`).
- No new interactive UI patterns are introduced — every reused component (`DocumentCard`, `DocumentUpload`, DSFR `Tabs`/`Dropdown`, delete/rename modals) is already RGAA-compliant in production; the final task re-verifies no regression.
- Never use `git commit --no-verify`; the repo's Talisman pre-commit hook may flag false-positive "secret patterns" in generated SQL/code comments — if that happens, add the suggested checksum to `.talismanrc` rather than bypass the hook.

---

### Task 1: Shared `canWriteDocument` permission helper + generic upload constants

**Files:**

- Modify: `packages/models/src/DocumentDTO.ts`
- Modify: `packages/models/src/HousingDocumentDTO.ts`
- Create: `packages/models/src/test/DocumentDTO.test.ts`
- Modify: `server/src/controllers/documentController.ts`
- Modify: `server/src/routers/protected.ts`
- Modify: `frontend/src/components/FileUpload/HousingDocumentUpload.tsx`
- Modify: `frontend/src/components/HousingDetails/DocumentCard.tsx`

**Interfaces:**

- Produces: `canWriteDocument(role: UserRole, sameEstablishment: boolean): boolean` from `@zerologementvacant/models`.
- Produces: `ACCEPTED_DOCUMENT_EXTENSIONS: ReadonlyArray<string>`, `MAX_DOCUMENT_SIZE_IN_MiB: number` from `@zerologementvacant/models` (renamed from `ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS`/`MAX_HOUSING_DOCUMENT_SIZE_IN_MiB`).

- [ ] **Step 1: Write the failing test for `canWriteDocument`**

Create `packages/models/src/test/DocumentDTO.test.ts`:

```ts
import { canWriteDocument } from '../DocumentDTO';
import { UserRole } from '../UserRole';

describe('DocumentDTO', () => {
  describe('canWriteDocument', () => {
    it('should allow an admin regardless of establishment', () => {
      expect(canWriteDocument(UserRole.ADMIN, false)).toBe(true);
      expect(canWriteDocument(UserRole.ADMIN, true)).toBe(true);
    });

    it('should allow a usual user only in the same establishment', () => {
      expect(canWriteDocument(UserRole.USUAL, true)).toBe(true);
      expect(canWriteDocument(UserRole.USUAL, false)).toBe(false);
    });

    it('should never allow a visitor', () => {
      expect(canWriteDocument(UserRole.VISITOR, true)).toBe(false);
      expect(canWriteDocument(UserRole.VISITOR, false)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test models -- DocumentDTO.test.ts`
Expected: FAIL — `canWriteDocument` is not exported from `../DocumentDTO`.

- [ ] **Step 3: Implement `canWriteDocument` and move the generic constants**

Modify `packages/models/src/DocumentDTO.ts` — add the import and function, keeping everything else unchanged:

```ts
import { Predicate } from 'effect';
import mime from 'mime';

import type { EstablishmentDTO } from './EstablishmentDTO';
import type { UserDTO } from './UserDTO';
import { UserRole } from './UserRole';

export interface DocumentDTO {
  id: string;
  filename: string;
  /*
   ** Pre-signed URL
   */
  url: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string | null;
  establishmentId: EstablishmentDTO['id'];
  creator: UserDTO;
}

export type DocumentPayload = Pick<DocumentDTO, 'filename'>;

export const ACCEPTED_DOCUMENT_EXTENSIONS: ReadonlyArray<string> = [
  'png',
  'jpg',
  'heic',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx'
];

export const MAX_DOCUMENT_SIZE_IN_MiB = 25;

const IMAGE_TYPES = ['jpeg', 'png', 'webp'];

export function isImage(document: DocumentDTO): boolean {
  return IMAGE_TYPES.map((type) => mime.getType(type))
    .filter(Predicate.isNotNull)
    .includes(document.contentType);
}

export function isPDF(document: DocumentDTO): boolean {
  return document.contentType === mime.getType('pdf');
}

export function canWriteDocument(
  role: UserRole,
  sameEstablishment: boolean
): boolean {
  return (
    role === UserRole.ADMIN || (role === UserRole.USUAL && sameEstablishment)
  );
}
```

Modify `packages/models/src/HousingDocumentDTO.ts` — remove the constants (now generic, defined above), keep only the type alias:

```ts
import type { DocumentDTO } from './DocumentDTO';

export type HousingDocumentDTO = DocumentDTO;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test models -- DocumentDTO.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Update the 3 remaining call sites of the renamed constants**

Modify `server/src/controllers/documentController.ts` — change the import (line 4-11) and usage (line 82-85):

```ts
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  HousingDocumentDTO,
  MAX_DOCUMENT_SIZE_IN_MiB,
  type DocumentDTO,
  type DocumentPayload,
  type HousingDTO
} from '@zerologementvacant/models';
```

```ts
await validate(file, {
  accept: ACCEPTED_DOCUMENT_EXTENSIONS,
  maxSize: MAX_DOCUMENT_SIZE_IN_MiB * 1024 ** 2
});
```

Note: `HousingDocumentDTO` is kept in the import (still used as `listByHousing`'s return type) — only the two constants are renamed.

Modify `server/src/routers/protected.ts` — change the import (line 1-5) and usage (line 57-60):

```ts
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_IN_MiB,
  UserRole
} from '@zerologementvacant/models';
```

```ts
router.post(
  '/documents',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  upload({
    accept: ACCEPTED_DOCUMENT_EXTENSIONS as string[],
    multiple: true,
    maxSizeMiB: MAX_DOCUMENT_SIZE_IN_MiB
  }),
  documentController.create
);
```

Modify `frontend/src/components/FileUpload/HousingDocumentUpload.tsx` — change the import (line 1-4) and usage (line 27):

```tsx
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  type DocumentDTO
} from '@zerologementvacant/models';
```

```tsx
      accept={ACCEPTED_DOCUMENT_EXTENSIONS as string[]}
```

- [ ] **Step 6: Use `canWriteDocument` in `DocumentCard.tsx`**

Modify `frontend/src/components/HousingDetails/DocumentCard.tsx` — change the import (line 7) and the permission computation (line 67-70):

```tsx
import {
  canWriteDocument,
  UserRole,
  type DocumentDTO
} from '@zerologementvacant/models';
```

```tsx
const { user, establishment } = useUser();
const sameEstablishment: boolean =
  establishment?.id === props.document.establishmentId;
const canWrite: boolean = canWriteDocument(
  user?.role ?? UserRole.VISITOR,
  sameEstablishment
);
```

- [ ] **Step 7: Run the full document-related test suites to check for regressions**

Run: `yarn nx test models -- DocumentDTO.test.ts` (expected: PASS)
Run: `yarn nx test server -- document-api.test.ts` (expected: PASS — behavior unchanged, only import renamed)
Run: `yarn nx test frontend -- HousingView.test.tsx` (expected: PASS — this is the existing coverage of `DocumentCard`'s permission gating; confirms the `canWriteDocument` extraction is behavior-preserving)
Run: `yarn nx run-many -t typecheck` (expected: no errors across all workspaces)

- [ ] **Step 8: Commit**

```bash
git add packages/models/src/DocumentDTO.ts packages/models/src/HousingDocumentDTO.ts packages/models/src/test/DocumentDTO.test.ts server/src/controllers/documentController.ts server/src/routers/protected.ts frontend/src/components/FileUpload/HousingDocumentUpload.tsx frontend/src/components/HousingDetails/DocumentCard.tsx
git commit -m "refactor: extract shared canWriteDocument helper and generalize upload constants"
```

---

### Task 2: Campaign document types, event types, and payload schema

**Files:**

- Create: `packages/models/src/CampaignDocumentDTO.ts`
- Modify: `packages/models/src/index.ts`
- Modify: `packages/models/src/EventType.ts`
- Modify: `packages/models/src/EventPayloads.ts`
- Create: `packages/schemas/src/campaign-document-payload.ts`
- Create: `packages/schemas/src/test/campaign-document-payload.test.ts`
- Modify: `packages/schemas/src/index.ts`

**Interfaces:**

- Consumes: nothing from Task 1 directly (independent of `canWriteDocument`).
- Produces: `CampaignDocumentDTO` (alias of `DocumentDTO`), event type strings `'campaign:document-attached' | 'campaign:document-detached' | 'campaign:document-removed'`, `campaignDocumentPayload: ObjectSchema<CampaignDocumentPayload>` where `CampaignDocumentPayload = { documentIds: string[] }` — all consumed by Task 3 and Task 4.

- [ ] **Step 1: Write the failing property-based test for the schema**

Create `packages/schemas/src/test/campaign-document-payload.test.ts`:

```ts
import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { campaignDocumentPayload } from '../campaign-document-payload';

describe('Campaign document payload', () => {
  test.prop({
    documentIds: fc.array(fc.uuid({ version: 4 }), {
      minLength: 1,
      maxLength: 10
    })
  })('should validate valid document IDs', (payload) => {
    const validate = () => campaignDocumentPayload.validateSync(payload);

    expect(validate).not.toThrow();
  });

  test.prop({
    documentIds: fc.constantFrom([], undefined, null)
  })('should reject empty or missing document IDs', (documentIds) => {
    const validate = () =>
      campaignDocumentPayload.validateSync({ documentIds });

    expect(validate).toThrow();
  });

  test.prop({
    documentIds: fc.array(fc.string(), { minLength: 1, maxLength: 5 })
  })('should reject non-UUID document IDs', (payload) => {
    const validate = () => campaignDocumentPayload.validateSync(payload);

    expect(validate).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test schemas -- campaign-document-payload.test.ts`
Expected: FAIL — cannot find module `../campaign-document-payload`.

- [ ] **Step 3: Implement the schema**

Create `packages/schemas/src/campaign-document-payload.ts`:

```ts
import { DocumentDTO } from '@zerologementvacant/models';
import { array, object, type ObjectSchema, string } from 'yup';

export interface CampaignDocumentPayload {
  documentIds: Array<DocumentDTO['id']>;
}

export const campaignDocumentPayload: ObjectSchema<CampaignDocumentPayload> =
  object({
    documentIds: array().of(string().uuid().required()).min(1).required()
  });
```

Modify `packages/schemas/src/index.ts` — add the import, register in the `schemas` object, and export the type:

```ts
import { buildingFilters } from './building-filters';
import { campaignCreationPayload } from './campaign-creation-payload';
import { campaignDocumentPayload } from './campaign-document-payload';
import { campaignFilters } from './campaign-filters';
import { campaignUpdateNextPayload } from './campaign-update-next-payload';
import { dateString } from './date-string';
import { documentPayload } from './document-payload';
import { draft } from './draft';
import {
  draftCreationPayload,
  sender,
  signatory
} from './draft-creation-payload';
import { draftUpdatePayload } from './draft-update-payload';
import { email } from './email';
import { establishmentFilters } from './establishment-filters';
import { geoCode } from './geo-code';
import { groupCreationPayload } from './group-creation-payload';
import { groupHousingPayload } from './group-housing-payload';
import { housingBatchUpdatePayload } from './housing-batch-update-payload';
import { housingDocumentPayload } from './housing-document-payload';
import { housingFilters } from './housing-filters';
import { housingUpdatePayload } from './housing-update-payload';
import { id } from './id';
import { notePayload } from './note-payload';
import { ownerFilters } from './owner-filters';
import { ownerPayload } from './owner-payload';
import { pagination } from './pagination';
import { password, passwordConfirmation } from './password';
import { phone } from './phone';
import { signIn } from './sign-in';
import { siren } from './siren';
import { sort } from './sort';
import { userFilters } from './user-filters';
import { userUpdatePayload } from './user-update-payload';

const schemas = {
  buildingFilters,
  campaignCreationPayload,
  campaignDocumentPayload,
  campaignFilters,
  campaignUpdateNextPayload,
  dateString,
  documentPayload,
  draft,
  draftCreationPayload,
  draftUpdatePayload,
  email,
  establishmentFilters,
  geoCode,
  groupCreationPayload,
  groupHousingPayload,
  housingBatchUpdatePayload,
  housingDocumentPayload,
  housingFilters,
  housingUpdatePayload,
  id,
  notePayload,
  ownerFilters,
  ownerPayload,
  pagination,
  password,
  passwordConfirmation,
  phone,
  sender,
  signatory,
  signIn,
  siren,
  sort,
  userFilters,
  userUpdatePayload
};

export { GEO_CODE_REGEXP } from './geo-code';
export { type CampaignDocumentPayload } from './campaign-document-payload';
export { type HousingDocumentPayload } from './housing-document-payload';
export { MAX_PER_PAGE } from './pagination';
export { PHONE_REGEXP } from './phone';
export { SIREN_REGEXP } from './siren';

export default schemas;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test schemas -- campaign-document-payload.test.ts`
Expected: PASS (3 property-based tests).

- [ ] **Step 5: Add `CampaignDocumentDTO`, register it, and add the new event types**

Create `packages/models/src/CampaignDocumentDTO.ts`:

```ts
import type { DocumentDTO } from './DocumentDTO';

export type CampaignDocumentDTO = DocumentDTO;
```

Modify `packages/models/src/index.ts` — add the export right after `CampaignDTO`:

```ts
export * from './CampaignDTO';
export * from './CampaignDocumentDTO';
```

Modify `packages/models/src/EventType.ts` — add the 3 new type strings after `'housing:document-removed'`:

```ts
export const EVENT_TYPE_VALUES = [
  'housing:created',
  'housing:updated',
  'housing:occupancy-updated',
  'housing:status-updated',
  'housing:precision-attached',
  'housing:precision-detached',
  'housing:owner-attached',
  'housing:owner-updated',
  'housing:owner-detached',
  'housing:perimeter-attached',
  'housing:perimeter-detached',
  'housing:group-attached',
  'housing:group-detached',
  'housing:group-removed',
  'housing:campaign-attached',
  'housing:campaign-detached',
  'housing:campaign-removed',
  'housing:document-attached',
  'housing:document-detached',
  'housing:document-removed',
  'document:created',
  'document:updated',
  'document:removed',
  'campaign:document-attached',
  'campaign:document-detached',
  'campaign:document-removed',
  'owner:updated',
  'campaign:updated'
] as const satisfies ReadonlyArray<EventType>;
```

Modify `packages/models/src/EventPayloads.ts` — add the 3 new payload shapes right after the `'housing:document-removed'` entry (around line 137):

```ts
  // Campaign-document association events
  'campaign:document-attached': CreationEventChange<{
    filename: string;
  }>;

  'campaign:document-detached': RemoveEventChange<{
    filename: string;
  }>;

  'campaign:document-removed': RemoveEventChange<{
    filename: string;
  }>;
```

- [ ] **Step 6: Typecheck**

Run: `yarn nx run-many -t typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/models/src/CampaignDocumentDTO.ts packages/models/src/index.ts packages/models/src/EventType.ts packages/models/src/EventPayloads.ts packages/schemas/src/campaign-document-payload.ts packages/schemas/src/test/campaign-document-payload.test.ts packages/schemas/src/index.ts
git commit -m "feat: add CampaignDocumentDTO, campaign-document event types, and payload schema"
```

---

### Task 3: Migrations + `CampaignDocumentApi` + `campaignDocumentRepository`

**Files:**

- Create: `server/src/infra/database/migrations/20260720100000_documents-campaigns.ts`
- Create: `server/src/infra/database/migrations/20260720100001_campaign-document-events.ts`
- Create: `server/src/models/CampaignDocumentApi.ts`
- Modify: `server/src/test/testFixtures.ts`
- Create: `server/src/repositories/test/campaignDocumentRepository.test.ts`
- Create: `server/src/repositories/campaignDocumentRepository.ts`

**Interfaces:**

- Consumes: `CampaignDocumentDTO` (Task 2), `DocumentApi`/`toDocumentDTO`/`documentRepository` internals (existing).
- Produces: `campaignDocumentRepository.{link, linkMany, unlink, unlinkMany, find, get, remove}`, `CampaignDocumentApi { ...DocumentApi, campaignId: string }`, `toCampaignDocumentDTO`, `genCampaignDocumentApi()` fixture — all consumed by Task 4.

- [ ] **Step 1: Create the migrations**

Create `server/src/infra/database/migrations/20260720100000_documents-campaigns.ts`:

```ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents_campaigns', (table) => {
    table.uuid('document_id').notNullable();
    table.uuid('campaign_id').notNullable();

    table.primary(['document_id', 'campaign_id']);
    table
      .foreign('document_id')
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .foreign('campaign_id')
      .references('id')
      .inTable('campaigns')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.index('campaign_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('documents_campaigns');
}
```

Create `server/src/infra/database/migrations/20260720100001_campaign-document-events.ts`:

```ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('campaign_document_events', (table) => {
    table
      .uuid('event_id')
      .primary()
      .references('id')
      .inTable('events')
      .onDelete('CASCADE');
    table
      .uuid('document_id')
      .notNullable()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE');
    table
      .uuid('campaign_id')
      .notNullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE');

    table.index('document_id');
    table.index('campaign_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('campaign_document_events');
}
```

Run the migrations against the local/test databases:

```bash
export DEV_DB=postgres://postgres:postgres@localhost/dev
export TEST_DB=postgres://postgres:postgres@localhost/test
yarn workspace @zerologementvacant/server migrate
```

- [ ] **Step 2: Add the `CampaignDocumentApi` model**

Create `server/src/models/CampaignDocumentApi.ts`:

```ts
import { CampaignDocumentDTO } from '@zerologementvacant/models';

import {
  DocumentApi,
  toDocumentDTO,
  type FetchDocumentURLOptions
} from './DocumentApi';

export interface CampaignDocumentApi extends DocumentApi {
  campaignId: string;
}

export async function toCampaignDocumentDTO(
  document: CampaignDocumentApi,
  options: FetchDocumentURLOptions
): Promise<CampaignDocumentDTO> {
  return toDocumentDTO(document, options);
}
```

- [ ] **Step 3: Add the `genCampaignDocumentApi` fixture**

Modify `server/src/test/testFixtures.ts` — add this function right after `genHousingDocumentApi` (around line 583), and add `import { CampaignDocumentApi } from '~/models/CampaignDocumentApi';` near the other model imports at the top of the file:

```ts
export function genCampaignDocumentApi(
  overrides?: Partial<CampaignDocumentApi>
): CampaignDocumentApi {
  const baseDocument = genDocumentApi(overrides);

  return {
    ...baseDocument,
    campaignId: overrides?.campaignId ?? faker.string.uuid()
  };
}
```

- [ ] **Step 4: Write the failing repository test**

Create `server/src/repositories/test/campaignDocumentRepository.test.ts`:

```ts
import { faker } from '@faker-js/faker/locale/fr';

import { CampaignApi } from '~/models/CampaignApi';
import { CampaignDocumentApi } from '~/models/CampaignDocumentApi';
import campaignDocumentRepository, {
  CampaignDocuments,
  toCampaignDocumentDBO,
  type CampaignDocumentDBO
} from '~/repositories/campaignDocumentRepository';
import { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { factories } from '~/test/factories';
import {
  genCampaignDocumentApi,
  genEstablishmentApi,
  genUserApi
} from '~/test/testFixtures';

describe('Campaign document repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('link', () => {
    it('should create document-campaign link', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const campaignDocument = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(campaignDocument));

      await campaignDocumentRepository.link(campaignDocument);

      const actual = await CampaignDocuments()
        .where('document_id', campaignDocument.id)
        .first();

      expect(actual).toMatchObject({
        document_id: campaignDocument.id,
        campaign_id: campaign.id
      });
    });

    it('should be idempotent (ignore duplicate links)', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const campaignDocument = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(campaignDocument));

      await campaignDocumentRepository.link(campaignDocument);
      await campaignDocumentRepository.link(campaignDocument);

      const actual = await CampaignDocuments().where(
        'document_id',
        campaignDocument.id
      );
      expect(actual).toHaveLength(1);
    });
  });

  describe('linkMany', () => {
    it('should create multiple document-campaign links (cartesian product)', async () => {
      const campaigns = await factories
        .campaign(establishment)
        .createList(2, {}, { associations: { createdBy: user } });

      const campaignDocuments = [
        genCampaignDocumentApi({ createdBy: user.id, creator: user }),
        genCampaignDocumentApi({ createdBy: user.id, creator: user })
      ];
      await Documents().insert(campaignDocuments.map(toDocumentDBO));

      const links = campaignDocuments.flatMap((d) =>
        campaigns.map((c) => ({
          document_id: d.id,
          campaign_id: c.id
        }))
      );
      await campaignDocumentRepository.linkMany(links);

      const allLinks = await CampaignDocuments().whereIn(
        'document_id',
        campaignDocuments.map((d) => d.id)
      );

      expect(allLinks).toHaveLength(4);
    });

    it('should handle empty arrays', async () => {
      await expect(
        campaignDocumentRepository.linkMany([])
      ).resolves.not.toThrow();
    });
  });

  describe('unlink', () => {
    it('should remove document-campaign link', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const campaignDocument = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(campaignDocument));

      const linkDBO: CampaignDocumentDBO = {
        document_id: campaignDocument.id,
        campaign_id: campaign.id
      };
      await CampaignDocuments().insert(linkDBO);

      await campaignDocumentRepository.unlink({
        documentId: campaignDocument.id,
        campaignId: campaign.id
      });

      const actual = await CampaignDocuments().where(
        'document_id',
        campaignDocument.id
      );
      expect(actual).toHaveLength(0);
    });
  });

  describe('get', () => {
    let campaign: CampaignApi;
    let document: CampaignDocumentApi;

    beforeAll(async () => {
      campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      document = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(document));
      await CampaignDocuments().insert(toCampaignDocumentDBO(document));
    });

    it('should return null if the document is missing', async () => {
      const actual = await campaignDocumentRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });

    it('should return the document if it exists', async () => {
      const actual = await campaignDocumentRepository.get(document.id);

      expect(actual).toBeDefined();
      expect(actual).toMatchObject<Partial<CampaignDocumentApi>>({
        id: document.id,
        filename: document.filename,
        s3Key: document.s3Key,
        contentType: document.contentType,
        sizeBytes: document.sizeBytes,
        campaignId: campaign.id,
        createdBy: user.id
      });
    });

    it('should include creator information', async () => {
      const actual = await campaignDocumentRepository.get(document.id);

      expect(actual).toBeDefined();
      expect(actual!.creator).toBeDefined();
      expect(actual!.creator.id).toBe(user.id);
      expect(actual!.creator.email).toBe(user.email);
    });

    it('should return null when campaign does not match', async () => {
      const differentCampaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const actual = await campaignDocumentRepository.get(document.id, {
        campaign: [differentCampaign.id]
      });

      expect(actual).toBeNull();
    });
  });

  describe('remove', () => {
    it('should soft-delete the document', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(document));
      await CampaignDocuments().insert(toCampaignDocumentDBO(document));

      await campaignDocumentRepository.remove(document);

      const actualDocument = await Documents()
        .where({ id: document.id })
        .first();

      expect(actualDocument).toBeDefined();
      expect(actualDocument!.deleted_at).not.toBeNull();

      const actualLink = await CampaignDocuments()
        .where({ document_id: document.id, campaign_id: campaign.id })
        .first();

      expect(actualLink).toBeDefined();
    });
  });

  describe('unlinkMany', () => {
    it('should unlink multiple documents from all campaigns', async () => {
      const campaigns = await factories
        .campaign(establishment)
        .createList(2, {}, { associations: { createdBy: user } });
      const campaignDocuments = [
        genCampaignDocumentApi({ createdBy: user.id, creator: user }),
        genCampaignDocumentApi({ createdBy: user.id, creator: user })
      ];

      await Documents().insert(campaignDocuments.map(toDocumentDBO));

      const links = campaignDocuments.flatMap((doc) =>
        campaigns.map((c) => ({
          document_id: doc.id,
          campaign_id: c.id
        }))
      );
      await campaignDocumentRepository.linkMany(links);

      const linksBefore = await CampaignDocuments().whereIn(
        'document_id',
        campaignDocuments.map((doc) => doc.id)
      );
      expect(linksBefore).toHaveLength(4);

      await campaignDocumentRepository.unlinkMany({
        documentIds: campaignDocuments.map((doc) => doc.id)
      });

      const linksAfter = await CampaignDocuments().whereIn(
        'document_id',
        campaignDocuments.map((doc) => doc.id)
      );
      expect(linksAfter).toBeEmpty();
    });

    it('should handle empty array', async () => {
      await expect(
        campaignDocumentRepository.unlinkMany({ documentIds: [] })
      ).resolves.not.toThrow();
    });

    it('should only unlink specified documents', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const documents = [
        genCampaignDocumentApi({
          createdBy: user.id,
          creator: user,
          campaignId: campaign.id
        }),
        genCampaignDocumentApi({
          createdBy: user.id,
          creator: user,
          campaignId: campaign.id
        })
      ];

      await Documents().insert(documents.map(toDocumentDBO));

      const links = documents.map((doc) => ({
        document_id: doc.id,
        campaign_id: campaign.id
      }));
      await campaignDocumentRepository.linkMany(links);

      await campaignDocumentRepository.unlinkMany({
        documentIds: [documents[0].id]
      });

      const remainingLinks = await CampaignDocuments().where({
        campaign_id: campaign.id
      });
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].document_id).toBe(documents[1].id);
    });
  });
});
```

**Note on factories**: `campaign` is created via `factories.campaign(establishment).create(...)`/`.createList(...)` from `~/test/factories` (the server-side fishery factory, already used this way in `campaignRepository.test.ts`) rather than `genCampaignApi` + a manual `Campaigns().insert(...)` — the factory does both in one call. `establishment`/`user` stay on `genEstablishmentApi()`/`genUserApi()` + manual insert, matching the actual convention in every migrated file today (no test in this codebase calls `factories.establishment`/`factories.user` yet — only the entity under test gets the factory treatment). `genCampaignDocumentApi` also stays as-is: no `document`/`campaignDocument` factory exists anywhere in this codebase, and the factories migration's own design docs explicitly list documents as out of scope.

- [ ] **Step 5: Run the test to verify it fails**

Run: `yarn nx test server -- campaignDocumentRepository.test.ts`
Expected: FAIL — cannot find module `~/repositories/campaignDocumentRepository`.

- [ ] **Step 6: Implement `campaignDocumentRepository.ts`**

Create `server/src/repositories/campaignDocumentRepository.ts`:

```ts
import type { Knex } from 'knex';

import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { CampaignApi } from '~/models/CampaignApi';
import { CampaignDocumentApi } from '~/models/CampaignDocumentApi';
import { UserDBO, USERS_TABLE } from '~/repositories/userRepository';

import {
  Documents,
  DOCUMENTS_TABLE,
  fromDocumentDBO,
  type DocumentDBO
} from './documentRepository';

const logger = createLogger('campaignDocumentRepository');

export const CAMPAIGN_DOCUMENT_TABLE = 'documents_campaigns';

export const CampaignDocuments = (
  transaction: Knex<CampaignDocumentDBO> = db
) => transaction<CampaignDocumentDBO>(CAMPAIGN_DOCUMENT_TABLE);

export interface CampaignDocumentDBO {
  document_id: string;
  campaign_id: string;
}

type CampaignDocumentWithCreatorDBO = DocumentDBO &
  CampaignDocumentDBO & {
    creator: UserDBO;
  };

async function link(document: CampaignDocumentApi): Promise<void> {
  logger.debug('Creating document-campaign link', {
    documentId: document.id,
    campaignId: document.campaignId
  });

  await withinTransaction(async (transaction) => {
    await CampaignDocuments(transaction)
      .insert(toCampaignDocumentDBO(document))
      .onConflict(['document_id', 'campaign_id'])
      .ignore();
  });
}

async function linkMany(
  campaignDocuments: ReadonlyArray<CampaignDocumentDBO>
): Promise<void> {
  if (campaignDocuments.length === 0) {
    logger.debug('No campaign documents to link. Skipping...');
    return;
  }

  logger.debug('Linking documents to campaigns...', { campaignDocuments });

  await withinTransaction(async (transaction) => {
    await CampaignDocuments(transaction)
      .insert(campaignDocuments)
      .onConflict(['document_id', 'campaign_id'])
      .ignore();
  });
}

async function unlink(link: {
  documentId: string;
  campaignId: string;
}): Promise<void> {
  logger.debug('Unlinking document from campaign...', link);

  await CampaignDocuments()
    .where({
      document_id: link.documentId,
      campaign_id: link.campaignId
    })
    .delete();
}

async function unlinkMany(params: { documentIds: string[] }): Promise<void> {
  if (!params.documentIds.length) {
    logger.debug('No documents to unlink. Skipping...');
    return;
  }

  logger.debug('Unlinking documents from campaigns...', {
    documents: params.documentIds.length
  });

  await withinTransaction(async (transaction) => {
    await CampaignDocuments(transaction)
      .whereIn('document_id', params.documentIds)
      .delete();
  });

  logger.debug('Documents unlinked from campaigns', {
    documents: params.documentIds.length
  });
}

interface FindOptions {
  filters?: {
    documentIds?: string[];
    campaignIds?: Array<CampaignApi['id']>;
    deleted?: boolean;
  };
}

async function find(
  options?: FindOptions
): Promise<ReadonlyArray<CampaignDocumentApi>> {
  logger.debug('Finding document-campaign links...', options);

  const documents = await listQuery()
    .modify((query) => {
      if (options?.filters?.documentIds?.length) {
        query.whereIn(
          `${CAMPAIGN_DOCUMENT_TABLE}.document_id`,
          options.filters.documentIds
        );
      }

      if (options?.filters?.campaignIds?.length) {
        query.whereIn(
          `${CAMPAIGN_DOCUMENT_TABLE}.campaign_id`,
          options.filters.campaignIds
        );
      }

      if (options?.filters?.deleted === true) {
        query.whereNotNull(`${DOCUMENTS_TABLE}.deleted_at`);
      } else if (options?.filters?.deleted === false) {
        query.whereNull(`${DOCUMENTS_TABLE}.deleted_at`);
      }
    })
    .orderBy(`${DOCUMENTS_TABLE}.created_at`, 'desc');

  return documents.map(fromCampaignDocumentDBO);
}

interface GetOptions {
  campaign?: Array<CampaignApi['id']>;
}

async function get(
  id: string,
  options?: GetOptions
): Promise<CampaignDocumentApi | null> {
  logger.debug('Getting campaign document...', { id });
  const document = await listQuery()
    .where(`${CAMPAIGN_DOCUMENT_TABLE}.document_id`, id)
    .modify((query) => {
      if (options?.campaign?.length) {
        query.whereIn(
          `${CAMPAIGN_DOCUMENT_TABLE}.campaign_id`,
          options.campaign
        );
      }
    })
    .first();

  return document ? fromCampaignDocumentDBO(document) : null;
}

async function remove(document: CampaignDocumentApi): Promise<void> {
  logger.debug('Soft-deleting campaign document...', document);
  await Documents().where('id', document.id).update({ deleted_at: new Date() });
}

function listQuery() {
  return Documents()
    .select(
      `${DOCUMENTS_TABLE}.*`,
      `${CAMPAIGN_DOCUMENT_TABLE}.campaign_id`,
      db.raw(`json_build_object(
        'id', ${USERS_TABLE}.id,
        'email', ${USERS_TABLE}.email,
        'first_name', ${USERS_TABLE}.first_name,
        'last_name', ${USERS_TABLE}.last_name,
        'role', ${USERS_TABLE}.role,
        'establishment_id', ${USERS_TABLE}.establishment_id,
        'time_per_week', ${USERS_TABLE}.time_per_week,
        'phone', ${USERS_TABLE}.phone,
        'position', ${USERS_TABLE}.position,
        'updated_at', ${USERS_TABLE}.updated_at
      ) as creator`)
    )
    .join(
      CAMPAIGN_DOCUMENT_TABLE,
      `${CAMPAIGN_DOCUMENT_TABLE}.document_id`,
      `${DOCUMENTS_TABLE}.id`
    )
    .join(USERS_TABLE, `${USERS_TABLE}.id`, `${DOCUMENTS_TABLE}.created_by`);
}

export function toCampaignDocumentDBO(
  document: CampaignDocumentApi
): CampaignDocumentDBO {
  return {
    document_id: document.id,
    campaign_id: document.campaignId
  };
}

export function fromCampaignDocumentDBO(
  dbo: CampaignDocumentWithCreatorDBO
): CampaignDocumentApi {
  if (!dbo.creator) {
    throw new Error('Creator not fetched');
  }

  return {
    ...fromDocumentDBO(dbo),
    campaignId: dbo.campaign_id
  };
}

const campaignDocumentRepository = {
  link,
  linkMany,
  unlink,
  unlinkMany,
  find,
  get,
  remove
};

export default campaignDocumentRepository;
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `yarn nx test server -- campaignDocumentRepository.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 8: Commit**

```bash
git add server/src/infra/database/migrations/20260720100000_documents-campaigns.ts server/src/infra/database/migrations/20260720100001_campaign-document-events.ts server/src/models/CampaignDocumentApi.ts server/src/test/testFixtures.ts server/src/repositories/campaignDocumentRepository.ts server/src/repositories/test/campaignDocumentRepository.test.ts
git commit -m "feat: add documents_campaigns junction table and campaignDocumentRepository"
```

---

### Task 4: Events plumbing + controller + router

**Files:**

- Modify: `server/src/models/EventApi.ts`
- Modify: `server/src/repositories/eventRepository.ts`
- Modify: `server/src/controllers/test/document-api.test.ts`
- Modify: `server/src/controllers/documentController.ts`
- Modify: `server/src/routers/protected.ts`

**Interfaces:**

- Consumes: `campaignDocumentRepository` (Task 3), `campaignDocumentPayload` schema (Task 2), `campaignRepository.findOne({id, establishmentId})` (existing), `CampaignMissingError` (existing).
- Produces: `documentController.{linkToCampaign, listByCampaign, removeByCampaign}`, routes `GET/POST /campaigns/:id/documents`, `DELETE /campaigns/:id/documents/:documentId` — consumed by Task 5 (frontend).

- [ ] **Step 1: Add `CampaignDocumentEventApi` and the eventRepository plumbing**

Modify `server/src/models/EventApi.ts` — add this type right after `HousingDocumentEventApi` (around line 120):

```ts
// Campaign-document association events
export type CampaignDocumentEventApi = EventUnion<
  | 'campaign:document-attached'
  | 'campaign:document-detached'
  | 'campaign:document-removed'
> & {
  campaignId: string;
  documentId: string;
};
```

Modify `server/src/repositories/eventRepository.ts`:

Add to the import from `~/models/EventApi` (alphabetically, after `CampaignHousingEventApi`):

```ts
import {
  CampaignDocumentEventApi,
  CampaignEventApi,
  CampaignHousingEventApi,
  DocumentEventApi,
  EventApi,
  EventUnion,
  GroupHousingEventApi,
  HousingDocumentEventApi,
  HousingEventApi,
  HousingOwnerEventApi,
  OwnerEventApi,
  PerimeterHousingEventApi,
  PrecisionHousingEventApi
} from '~/models/EventApi';
```

Add the table constant and accessor, near the other document ones (after `HOUSING_DOCUMENT_EVENTS_TABLE`/`HousingDocumentEvents`):

```ts
export const CAMPAIGN_DOCUMENT_EVENTS_TABLE = 'campaign_document_events';

export const CampaignDocumentEvents = (transaction = db) =>
  transaction<CampaignDocumentEventDBO>(CAMPAIGN_DOCUMENT_EVENTS_TABLE);
```

Add the insert function, right after `insertManyHousingDocumentEvents`:

```ts
async function insertManyCampaignDocumentEvents(
  events: ReadonlyArray<CampaignDocumentEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting campaign document events...', {
    events: events.length
  });
  await withinTransaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      CAMPAIGN_DOCUMENT_EVENTS_TABLE,
      events.map(formatCampaignDocumentEventApi)
    );
  });
}
```

Add the DBO type and formatter, right after `formatHousingDocumentEventApi`:

```ts
export interface CampaignDocumentEventDBO {
  event_id: string;
  campaign_id: string;
  document_id: string;
}

export function formatCampaignDocumentEventApi(
  event: CampaignDocumentEventApi
): CampaignDocumentEventDBO {
  return {
    event_id: event.id,
    campaign_id: event.campaignId,
    document_id: event.documentId
  };
}
```

Register the new function in the default export:

```ts
export default {
  insertManyCampaignEvents,
  insertManyCampaignHousingEvents,
  insertManyCampaignDocumentEvents,
  insertManyHousingEvents,
  insertManyHousingOwnerEvents,
  insertManyGroupHousingEvents,
  insertManyOwnerEvents,
  insertManyPrecisionHousingEvents,
  insertManyDocumentEvents,
  insertManyHousingDocumentEvents,
  find,
  removeCampaignEvents
};
```

- [ ] **Step 2: Write the failing controller tests**

Modify `server/src/controllers/test/document-api.test.ts`. Add one new import, and replace the existing `eventRepository`/`testFixtures` import lines with their merged versions below (don't leave the old, narrower versions of those two lines in place — and drop `genCampaignApi`, it's no longer needed once campaigns are created via the factory):

```ts
import { CampaignDocuments } from '~/repositories/campaignDocumentRepository';
import {
  CAMPAIGN_DOCUMENT_EVENTS_TABLE,
  DOCUMENT_EVENTS_TABLE,
  Events,
  EVENTS_TABLE,
  HOUSING_DOCUMENT_EVENTS_TABLE,
  type EventDBO
} from '~/repositories/eventRepository';
```

This replaces the file's existing `eventRepository` import line. Also add `import { factories } from '~/test/factories';` and replace the existing `testFixtures` import line with:

```ts
import {
  genDocumentApi,
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';
```

Add these `describe` blocks at the end of the file, right before the final closing `});` of `describe('Document API', ...)`:

```ts
describe('POST /campaigns/:id/documents', () => {
  const testRoute = (id: string) => `/campaigns/${id}/documents`;

  it('should link documents to campaign', async () => {
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    const document = genDocumentApi({
      createdBy: user.id,
      creator: user,
      establishmentId: establishment.id
    });
    await Documents().insert(toDocumentDBO(document));

    const { status, body } = await request(url)
      .post(testRoute(campaign.id))
      .use(tokenProvider(user))
      .send({ documentIds: [document.id] });

    expect(status).toBe(constants.HTTP_STATUS_CREATED);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: document.id });
  });

  it('should create an event "campaign:document-attached"', async () => {
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    const document = genDocumentApi({
      createdBy: user.id,
      creator: user,
      establishmentId: establishment.id
    });
    await Documents().insert(toDocumentDBO(document));

    const { status } = await request(url)
      .post(testRoute(campaign.id))
      .use(tokenProvider(user))
      .send({ documentIds: [document.id] });

    expect(status).toBe(constants.HTTP_STATUS_CREATED);
    const event = await Events()
      .where({ type: 'campaign:document-attached' })
      .join(
        CAMPAIGN_DOCUMENT_EVENTS_TABLE,
        `${CAMPAIGN_DOCUMENT_EVENTS_TABLE}.event_id`,
        `${EVENTS_TABLE}.id`
      )
      .where(`${CAMPAIGN_DOCUMENT_EVENTS_TABLE}.document_id`, document.id)
      .first();
    expect(event).toMatchObject<
      Partial<EventDBO<'campaign:document-attached'>>
    >({
      type: 'campaign:document-attached',
      next_old: null,
      next_new: { filename: document.filename },
      created_by: user.id
    });
  });

  it('should return 404 if campaign not found', async () => {
    const { status } = await request(url)
      .post(testRoute(faker.string.uuid()))
      .use(tokenProvider(user))
      .send({ documentIds: [faker.string.uuid()] });

    expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });

  it('should return 404 if campaign belongs to another establishment', async () => {
    const campaign = await factories
      .campaign(anotherEstablishment)
      .create(
        {},
        { associations: { createdBy: userFromAnotherEstablishment } }
      );
    const document = genDocumentApi({
      createdBy: userFromAnotherEstablishment.id,
      creator: userFromAnotherEstablishment,
      establishmentId: anotherEstablishment.id
    });
    await Documents().insert(toDocumentDBO(document));

    const { status } = await request(url)
      .post(testRoute(campaign.id))
      .use(tokenProvider(user))
      .send({ documentIds: [document.id] });

    expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });

  it('should return 403 for a visitor', async () => {
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    const document = genDocumentApi({
      createdBy: user.id,
      creator: user,
      establishmentId: establishment.id
    });
    await Documents().insert(toDocumentDBO(document));

    const { status } = await request(url)
      .post(testRoute(campaign.id))
      .use(tokenProvider(visitor))
      .send({ documentIds: [document.id] });

    expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
  });
});

describe('GET /campaigns/:id/documents', () => {
  const testRoute = (id: string) => `/campaigns/${id}/documents`;

  it('should return 200 OK with documents list', async () => {
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    const document = genDocumentApi({
      createdBy: user.id,
      creator: user,
      establishmentId: establishment.id
    });
    await Documents().insert(toDocumentDBO(document));
    await CampaignDocuments().insert({
      document_id: document.id,
      campaign_id: campaign.id
    });

    const { status, body } = await request(url)
      .get(testRoute(campaign.id))
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
    expect(body).toBeArrayOfSize(1);
    expect(body[0]).toMatchObject({
      id: document.id,
      url: expect.stringContaining('http')
    });
  });

  it('should return 404 if campaign belongs to another establishment', async () => {
    const campaign = await factories
      .campaign(anotherEstablishment)
      .create(
        {},
        { associations: { createdBy: userFromAnotherEstablishment } }
      );

    const { status } = await request(url)
      .get(testRoute(campaign.id))
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });
});

describe('DELETE /campaigns/:id/documents/:documentId', () => {
  const testRoute = (id: string, documentId: string) =>
    `/campaigns/${id}/documents/${documentId}`;

  it('should remove association only (keep document)', async () => {
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    const document = genDocumentApi({
      createdBy: user.id,
      creator: user,
      establishmentId: establishment.id
    });
    await Documents().insert(toDocumentDBO(document));
    await CampaignDocuments().insert({
      document_id: document.id,
      campaign_id: campaign.id
    });

    const { status } = await request(url)
      .delete(testRoute(campaign.id, document.id))
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

    const links = await CampaignDocuments()
      .where({ document_id: document.id, campaign_id: campaign.id })
      .select('*');
    expect(links).toHaveLength(0);

    const [doc] = await Documents().where({ id: document.id }).select('*');
    expect(doc).toBeDefined();
    expect(doc.deleted_at).toBeNull();
  });

  it('should create an event "campaign:document-detached"', async () => {
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    const document = genDocumentApi({
      createdBy: user.id,
      creator: user,
      establishmentId: establishment.id
    });
    await Documents().insert(toDocumentDBO(document));
    await CampaignDocuments().insert({
      document_id: document.id,
      campaign_id: campaign.id
    });

    const { status } = await request(url)
      .delete(testRoute(campaign.id, document.id))
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    const event = await Events()
      .where({ type: 'campaign:document-detached' })
      .join(
        CAMPAIGN_DOCUMENT_EVENTS_TABLE,
        `${CAMPAIGN_DOCUMENT_EVENTS_TABLE}.event_id`,
        `${EVENTS_TABLE}.id`
      )
      .where(`${CAMPAIGN_DOCUMENT_EVENTS_TABLE}.document_id`, document.id)
      .first();
    expect(event).toMatchObject<
      Partial<EventDBO<'campaign:document-detached'>>
    >({
      type: 'campaign:document-detached',
      next_old: { filename: document.filename },
      next_new: null,
      created_by: user.id
    });
  });

  it('should return 404 if association not found', async () => {
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });

    const { status } = await request(url)
      .delete(testRoute(campaign.id, faker.string.uuid()))
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });

  it('should return 404 if campaign belongs to another establishment', async () => {
    const campaign = await factories
      .campaign(anotherEstablishment)
      .create(
        {},
        { associations: { createdBy: userFromAnotherEstablishment } }
      );
    const document = genDocumentApi({
      createdBy: userFromAnotherEstablishment.id,
      creator: userFromAnotherEstablishment,
      establishmentId: anotherEstablishment.id
    });
    await Documents().insert(toDocumentDBO(document));
    await CampaignDocuments().insert({
      document_id: document.id,
      campaign_id: campaign.id
    });

    const { status } = await request(url)
      .delete(testRoute(campaign.id, document.id))
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });
});

describe('DELETE /documents/:id (campaign cascade)', () => {
  it('should create an event "campaign:document-removed" for each campaign the document was attached to', async () => {
    const document = genDocumentApi({
      createdBy: user.id,
      creator: user,
      establishmentId: establishment.id
    });
    await Documents().insert(toDocumentDBO(document));
    const campaign = await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });
    await CampaignDocuments().insert({
      document_id: document.id,
      campaign_id: campaign.id
    });

    const { status } = await request(url)
      .delete(`/documents/${document.id}`)
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    const event = await Events()
      .where({ type: 'campaign:document-removed' })
      .join(
        CAMPAIGN_DOCUMENT_EVENTS_TABLE,
        `${CAMPAIGN_DOCUMENT_EVENTS_TABLE}.event_id`,
        `${EVENTS_TABLE}.id`
      )
      .where(`${CAMPAIGN_DOCUMENT_EVENTS_TABLE}.document_id`, document.id)
      .first();
    expect(event).toMatchObject<Partial<EventDBO<'campaign:document-removed'>>>(
      {
        type: 'campaign:document-removed',
        next_old: { filename: document.filename },
        next_new: null,
        created_by: user.id
      }
    );
  });
});
```

**Note on factories**: same rationale as Task 3 — `campaign` goes through `factories.campaign(establishment).create(...)` (server-side, from `~/test/factories`), `establishment`/`user`/`document` stay on `gen*Api()`, matching the codebase's actual, practiced convention. `Campaigns`/`formatCampaignApi` are no longer imported in this file since nothing calls them directly anymore.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn nx test server -- document-api.test.ts`
Expected: FAIL — `documentController.linkToCampaign`/`listByCampaign`/`removeByCampaign` don't exist, and the routes 404.

- [ ] **Step 4: Implement the controller methods**

Modify `server/src/controllers/documentController.ts`. Replace the `@zerologementvacant/models` import (already touched in Task 1, Step 5) with this merged version that adds `type CampaignDTO`:

```ts
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  HousingDocumentDTO,
  MAX_DOCUMENT_SIZE_IN_MiB,
  type CampaignDTO,
  type DocumentDTO,
  type DocumentPayload,
  type HousingDTO
} from '@zerologementvacant/models';
```

Replace the existing `import { type HousingDocumentPayload } from '@zerologementvacant/schemas';` line with this merged version that adds `type CampaignDocumentPayload`:

```ts
import {
  type CampaignDocumentPayload,
  type HousingDocumentPayload
} from '@zerologementvacant/schemas';
```

Add these new imports:

```ts
import CampaignMissingError from '~/errors/campaignMissingError';
import {
  CampaignDocumentApi,
  toCampaignDocumentDTO
} from '~/models/CampaignDocumentApi';
import { CampaignDocumentEventApi } from '~/models/EventApi';
import campaignDocumentRepository from '~/repositories/campaignDocumentRepository';
import campaignRepository from '~/repositories/campaignRepository';
```

Extend the `remove` function's cascade logic — replace the body between finding `housingDocuments` and the `startTransaction` call with:

```ts
// Find all housings linked to this document
const housingDocuments = await housingDocumentRepository.find({
  filters: { documentIds: [params.id] }
});
const removeEvents = housingDocuments.map<HousingDocumentEventApi>(
  (housingDocument) => ({
    id: uuidv4(),
    type: 'housing:document-removed',
    nextOld: { filename: document.filename },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: user.id,
    documentId: params.id,
    housingGeoCode: housingDocument.housingGeoCode,
    housingId: housingDocument.housingId
  })
);

// Find all campaigns linked to this document
const campaignDocuments = await campaignDocumentRepository.find({
  filters: { documentIds: [params.id] }
});
const campaignRemoveEvents = campaignDocuments.map<CampaignDocumentEventApi>(
  (campaignDocument) => ({
    id: uuidv4(),
    type: 'campaign:document-removed',
    nextOld: { filename: document.filename },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: user.id,
    documentId: params.id,
    campaignId: campaignDocument.campaignId
  })
);

const documentRemoveEvent: DocumentEventApi = {
  id: uuidv4(),
  type: 'document:removed',
  nextOld: { filename: document.filename },
  nextNew: null,
  createdAt: new Date().toJSON(),
  createdBy: request.user!.id,
  documentId: params.id
};
const deleteCommand = new DeleteObjectCommand({
  Bucket: config.s3.bucket,
  Key: document.s3Key
});

await startTransaction(async () => {
  await Promise.all([
    eventRepository.insertManyHousingDocumentEvents(removeEvents),
    eventRepository.insertManyCampaignDocumentEvents(campaignRemoveEvents),
    eventRepository.insertManyDocumentEvents([documentRemoveEvent]),
    housingDocumentRepository.unlinkMany({ documentIds: [params.id] }),
    campaignDocumentRepository.unlinkMany({ documentIds: [params.id] }),
    documentRepository.remove(params.id)
  ]);
  await s3.send(deleteCommand);
});
```

Add the three new handlers, right after `removeByHousing` and before the `documentController` export object:

```ts
const linkToCampaign: RequestHandler<
  { id: CampaignDTO['id'] },
  ReadonlyArray<DocumentDTO>,
  CampaignDocumentPayload,
  never
> = async (request, response) => {
  const { establishment, params, body, user } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    ReadonlyArray<DocumentDTO>,
    CampaignDocumentPayload,
    never
  >;

  logger.info('Linking documents to campaign', {
    campaign: params.id,
    documentCount: body.documentIds.length
  });

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: establishment.id
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  const documents = await documentRepository.find({
    filters: {
      ids: body.documentIds,
      establishmentIds: [establishment.id],
      deleted: false
    }
  });

  if (documents.length !== body.documentIds.length) {
    const foundIds = documents.map((document) => document.id);
    const missingIds = body.documentIds.filter((id) => !foundIds.includes(id));
    throw new DocumentMissingError(...missingIds);
  }

  const links = body.documentIds.map((documentId) => ({
    document_id: documentId,
    campaign_id: campaign.id
  }));
  const attachEvents = documents.map<CampaignDocumentEventApi>((document) => ({
    id: uuidv4(),
    type: 'campaign:document-attached',
    nextOld: null,
    nextNew: { filename: document.filename },
    createdAt: new Date().toJSON(),
    createdBy: user.id,
    documentId: document.id,
    campaignId: campaign.id
  }));

  await startTransaction(async () => {
    await Promise.all([
      campaignDocumentRepository.linkMany(links),
      eventRepository.insertManyCampaignDocumentEvents(attachEvents)
    ]);
  });

  const documentsWithURLs = await async.map(
    documents,
    async (document: DocumentApi) =>
      toDocumentDTO(document, { s3, bucket: config.s3.bucket })
  );

  response.status(constants.HTTP_STATUS_CREATED).json(documentsWithURLs);
};

const listByCampaign: RequestHandler<
  { id: CampaignDTO['id'] },
  DocumentDTO[],
  never,
  never
> = async (request, response): Promise<void> => {
  const { establishment, params } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    DocumentDTO[],
    never,
    never
  >;

  logger.debug('Finding documents by campaign...', { campaign: params.id });
  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: establishment.id
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  const documents = await campaignDocumentRepository.find({
    filters: { campaignIds: [campaign.id], deleted: false }
  });

  const documentsWithURLs = await async.map(
    [...documents],
    async (document: CampaignDocumentApi) =>
      toCampaignDocumentDTO(document, { s3, bucket: config.s3.bucket })
  );

  response.status(constants.HTTP_STATUS_OK).json(documentsWithURLs);
};

const removeByCampaign: RequestHandler<
  { id: CampaignDTO['id']; documentId: DocumentDTO['id'] },
  void,
  never,
  never
> = async (request, response) => {
  const { establishment, params, user } = request as AuthenticatedRequest<
    { id: CampaignDTO['id']; documentId: DocumentDTO['id'] },
    void,
    never,
    never
  >;

  logger.info('Removing document-campaign association', {
    campaign: params.id,
    document: params.documentId
  });

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: establishment.id
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  const links = await campaignDocumentRepository.find({
    filters: { campaignIds: [campaign.id] }
  });
  const document = links.find((link) => link.id === params.documentId);
  if (!document) {
    throw new DocumentMissingError(params.documentId);
  }

  const detachEvent: CampaignDocumentEventApi = {
    id: uuidv4(),
    type: 'campaign:document-detached',
    nextOld: { filename: document.filename },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: user.id,
    documentId: params.documentId,
    campaignId: campaign.id
  };

  await startTransaction(async () => {
    await Promise.all([
      eventRepository.insertManyCampaignDocumentEvents([detachEvent]),
      campaignDocumentRepository.unlink({
        documentId: params.documentId,
        campaignId: campaign.id
      })
    ]);
  });

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};
```

Update the exported object:

```ts
const documentController = {
  create,
  get,
  update,
  remove,
  linkToHousing,
  listByHousing,
  removeByHousing,
  linkToCampaign,
  listByCampaign,
  removeByCampaign
};
```

- [ ] **Step 5: Wire the routes**

Modify `server/src/routers/protected.ts` — add these routes right after the existing `router.delete('/campaigns/:id/housings', ...)` block (around line 329), before `router.get('/drafts', ...)`:

```ts
router.get(
  '/campaigns/:id/documents',
  validator.validate({
    params: object({ id: schemas.id })
  }),
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

- [ ] **Step 6: Run the tests to verify they pass**

Run: `yarn nx test server -- document-api.test.ts`
Expected: PASS (all describe blocks, including the pre-existing housing ones — confirms no regression).

- [ ] **Step 7: Commit**

```bash
git add server/src/models/EventApi.ts server/src/repositories/eventRepository.ts server/src/controllers/test/document-api.test.ts server/src/controllers/documentController.ts server/src/routers/protected.ts
git commit -m "feat: add campaign document link/list/remove endpoints"
```

---

### Task 5: Frontend RTK Query endpoints + MSW mocks

**Files:**

- Modify: `frontend/src/mocks/handlers/data.ts`
- Modify: `frontend/src/mocks/handlers/document-handlers.ts`
- Modify: `frontend/src/services/document.service.ts`

**Interfaces:**

- Consumes: `GET/POST /campaigns/:id/documents`, `DELETE /campaigns/:id/documents/:documentId` (Task 4, real backend); MSW mocks below simulate these for frontend tests.
- Produces: `useFindCampaignDocumentsQuery(campaignId)`, `useLinkDocumentsToCampaignMutation()`, `useUnlinkCampaignDocumentMutation()` — consumed by Task 6, 7, 8.

- [ ] **Step 1: Add the `campaignDocuments` map to the mock data store**

Modify `frontend/src/mocks/handlers/data.ts` — add the map near the other `campaign*` declarations (after `campaignHousings`):

```ts
const campaignDocuments = new Map<
  CampaignDTO['id'],
  ReadonlyArray<Pick<DocumentDTO, 'id'>>
>();
```

Add `campaignDocuments` to the default export object (insert the one new line after `campaigns`, keep every other line exactly as it already is):

```ts
export default {
  buildings,
  campaigns,
  campaignDocuments,
  campaignDrafts,
  campaignHousings,
  datafoncierHousings,
  documents,
  drafts,
  draftCampaigns,
  establishments,
  files,
  groups,
  groupHousings,
  housings,
  housingCampaigns,
  housingDocuments,
  housingEvents,
  housingFiles,
  housingNotes,
  housingOwners,
  housingPrecisions,
  localities,
  notes,
  owners,
  precisions,
  prospects,
  signupLinks,
  users,

  reset
};
```

(Note: `documents` and `housingDocuments` are not cleared in `reset()` either — `campaignDocuments` is intentionally left out of `reset()` too, for consistency with that existing behavior. The `reset()` function itself is unchanged.)

- [ ] **Step 2: Add the MSW handlers**

Modify `frontend/src/mocks/handlers/document-handlers.ts` — add `type CampaignDTO` to the existing type import from `@zerologementvacant/models`:

```ts
import type {
  CampaignDTO,
  DocumentDTO,
  DocumentPayload,
  HousingDTO
} from '@zerologementvacant/models';
```

Add these three handlers, right after `findByHousing`:

```ts
const findByCampaign = http.get<{ id: string }, never, DocumentDTO[]>(
  `${config.apiEndpoint}/campaigns/:id/documents`,
  async ({ params }) => {
    const documents = (data.campaignDocuments.get(params.id) ?? [])
      .map((ref) => data.documents.get(ref.id))
      .filter(Predicate.isNotUndefined);

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_OK
    });
  }
);

const linkToCampaign = http.post<
  { id: CampaignDTO['id'] },
  { documentIds: DocumentDTO['id'][] },
  DocumentDTO[] | Error
>(
  `${config.apiEndpoint}/campaigns/:id/documents`,
  async ({ params, request }) => {
    const { documentIds } = await request.json();

    const campaign = data.campaigns.find(
      (campaign) => campaign.id === params.id
    );
    if (!campaign) {
      return HttpResponse.json(
        {
          name: 'CampaignMissingError',
          message: `Campaign ${params.id} missing`
        },
        { status: constants.HTTP_STATUS_NOT_FOUND }
      );
    }

    const documents = documentIds
      .map((id) => data.documents.get(id))
      .filter(Predicate.isNotUndefined);

    if (documents.length !== documentIds.length) {
      return HttpResponse.json(
        { name: 'DocumentMissingError', message: 'Some documents not found' },
        { status: constants.HTTP_STATUS_BAD_REQUEST }
      );
    }

    const existingDocuments = data.campaignDocuments.get(params.id) ?? [];
    const newRefs = documentIds.map((id) => ({ id }));
    data.campaignDocuments.set(params.id, [...existingDocuments, ...newRefs]);

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);

const unlinkFromCampaign = http.delete<
  { id: CampaignDTO['id']; documentId: DocumentDTO['id'] },
  never,
  null | Error
>(
  `${config.apiEndpoint}/campaigns/:id/documents/:documentId`,
  async ({ params }) => {
    const exists = data.campaignDocuments
      .get(params.id)
      ?.map((document) => document.id)
      ?.includes(params.documentId);
    if (!exists) {
      return HttpResponse.json(
        {
          name: 'DocumentMissingError',
          message: `Document ${params.documentId} not linked to campaign`
        },
        { status: constants.HTTP_STATUS_NOT_FOUND }
      );
    }

    data.campaignDocuments.set(
      params.id,
      (data.campaignDocuments.get(params.id) ?? []).filter(
        (document) => document.id !== params.documentId
      )
    );

    return HttpResponse.json(null, {
      status: constants.HTTP_STATUS_NO_CONTENT
    });
  }
);
```

Register them in the exported array:

```ts
export const documentHandlers: RequestHandler[] = [
  upload,
  update,
  remove,
  findByHousing,
  linkToHousing,
  unlinkFromHousing,
  findByCampaign,
  linkToCampaign,
  unlinkFromCampaign
];
```

- [ ] **Step 3: Add the RTK Query endpoints**

Modify `frontend/src/services/document.service.ts` — add `CampaignDTO` to the type import:

```ts
import type {
  CampaignDTO,
  DocumentDTO,
  DocumentPayload,
  HousingDocumentDTO,
  HousingDTO
} from '@zerologementvacant/models';
```

Add these three endpoints inside `documentApi.injectEndpoints`'s `endpoints` builder object, right after `linkDocumentsToHousing`:

```ts
    findCampaignDocuments: builder.query<DocumentDTO[], CampaignDTO['id']>({
      query: (campaignId) => `campaigns/${campaignId}/documents`,
      providesTags: (documents, _error, campaignId) =>
        documents
          ? [
              ...documents.map((document) => ({
                type: 'Document' as const,
                id: document.id
              })),
              { type: 'Document', id: `LIST-${campaignId}` }
            ]
          : [{ type: 'Document', id: `LIST-${campaignId}` }]
    }),

    linkDocumentsToCampaign: builder.mutation<
      DocumentDTO[],
      { campaignId: CampaignDTO['id']; documentIds: DocumentDTO['id'][] }
    >({
      query: ({ campaignId, documentIds }) => ({
        url: `campaigns/${campaignId}/documents`,
        method: 'POST',
        body: { documentIds }
      }),
      invalidatesTags: (_result, _error, { campaignId }) => [
        { type: 'Document', id: `LIST-${campaignId}` }
      ]
    }),

    unlinkCampaignDocument: builder.mutation<
      void,
      { campaignId: CampaignDTO['id']; documentId: DocumentDTO['id'] }
    >({
      query: ({ campaignId, documentId }) => ({
        url: `campaigns/${campaignId}/documents/${documentId}`,
        method: 'DELETE'
      }),
      async onQueryStarted(
        { campaignId, documentId },
        { dispatch, queryFulfilled }
      ) {
        const patchResult = dispatch(
          documentApi.util.updateQueryData(
            'findCampaignDocuments',
            campaignId,
            (documents) => {
              const index = documents.findIndex(
                (draft) => draft.id === documentId
              );
              if (index !== -1) {
                documents.splice(index, 1);
              }
            }
          )
        );

        queryFulfilled.catch(patchResult.undo);
      }
    }),
```

Add the three hooks to the exported destructure:

```ts
export const {
  useFindHousingDocumentsQuery,
  useUploadDocumentsMutation,
  useLinkDocumentsToHousingMutation,
  useUpdateDocumentMutation,
  useUnlinkDocumentMutation,
  useDeleteDocumentMutation,
  useGetDocumentQuery,
  useFindCampaignDocumentsQuery,
  useLinkDocumentsToCampaignMutation,
  useUnlinkCampaignDocumentMutation
} = documentApi;
```

- [ ] **Step 4: Typecheck**

Run: `yarn nx run-many -t typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/mocks/handlers/data.ts frontend/src/mocks/handlers/document-handlers.ts frontend/src/services/document.service.ts
git commit -m "feat: add campaign document RTK Query endpoints and MSW mocks"
```

---

### Task 6: `CampaignDocumentUpload` component

**Files:**

- Create: `frontend/src/components/FileUpload/CampaignDocumentUpload.tsx`
- Create: `frontend/src/components/FileUpload/test/CampaignDocumentUpload.test.tsx`

**Interfaces:**

- Consumes: `DocumentUpload`, `useDocumentUpload` (existing, unchanged), `ACCEPTED_DOCUMENT_EXTENSIONS`/`MAX_DOCUMENT_SIZE_IN_MiB` (Task 1).
- Produces: `<CampaignDocumentUpload onUpload={(documents: DocumentDTO[]) => void} label?={string} />` — consumed by Task 7.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/FileUpload/test/CampaignDocumentUpload.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';

import CampaignDocumentUpload from '../CampaignDocumentUpload';

describe('CampaignDocumentUpload', () => {
  const user = userEvent.setup();

  function setup() {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const store = configureTestStore({
      auth: genAuthUser(fromUserDTO(auth), fromEstablishmentDTO(establishment))
    });
    const onUpload = vi.fn();

    render(
      <Provider store={store}>
        <CampaignDocumentUpload onUpload={onUpload} />
      </Provider>
    );

    return { onUpload };
  }

  it('renders the campaign-specific upload label', () => {
    setup();

    expect(
      screen.getByText('Associez un ou plusieurs documents à cette campagne')
    ).toBeInTheDocument();
  });

  it('accepts the generic document file types', () => {
    setup();

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept');
    expect(input?.getAttribute('accept')).toContain('application/pdf');
  });

  it('calls onUpload with the created documents after a successful upload', async () => {
    const { onUpload } = setup();
    const file = new File(['content'], 'campagne.pdf', {
      type: 'application/pdf'
    });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([
        expect.objectContaining({ filename: 'campagne.pdf' })
      ]);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test frontend -- CampaignDocumentUpload.test.tsx`
Expected: FAIL — cannot find module `../CampaignDocumentUpload`.

- [ ] **Step 3: Implement the component**

Create `frontend/src/components/FileUpload/CampaignDocumentUpload.tsx`:

```tsx
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_IN_MiB,
  type DocumentDTO
} from '@zerologementvacant/models';

import DocumentUpload, {
  type DocumentUploadProps
} from '~/components/FileUpload/DocumentUpload';
import { useDocumentUpload } from '~/components/FileUpload/useDocumentUpload';

export type CampaignDocumentUploadProps = Pick<DocumentUploadProps, 'label'> & {
  /**
   * Called every time documents are successfully uploaded.
   * @param documents
   */
  onUpload(documents: ReadonlyArray<DocumentDTO>): void;
};

function CampaignDocumentUpload(props: Readonly<CampaignDocumentUploadProps>) {
  const { error, isError, isLoading, isSuccess, upload } = useDocumentUpload({
    onUpload: props.onUpload
  });

  return (
    <DocumentUpload
      id="campaign-document-upload"
      accept={ACCEPTED_DOCUMENT_EXTENSIONS as string[]}
      error={error}
      hint={
        <div>
          Taille maximale par fichier : 25Mo. Formats supportés : images (png,
          jpg, heic, webp, etc.) et documents (docx, xlsx, ppt, etc.). Le nom du
          fichier doit faire moins de 255 caractères. Plusieurs fichiers
          possibles. Veillez à ne pas partager de{' '}
          <a
            href="https://cnil.fr/fr/definition/donnee-sensible#:~:text=Ce%20sont%20des%20informations%20qui,physique%20de%20mani%C3%A8re%20unique%2C%20des."
            target="_blank"
            rel="noopener noreferrer"
          >
            données sensibles
          </a>
          .
        </div>
      }
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      label={
        props.label ?? 'Associez un ou plusieurs documents à cette campagne'
      }
      maxSize={MAX_DOCUMENT_SIZE_IN_MiB}
      multiple
      onUpload={upload}
    />
  );
}

export default CampaignDocumentUpload;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test frontend -- CampaignDocumentUpload.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: RGAA self-check**

This component only composes the already-accessible DSFR `Upload` (via `DocumentUpload`) with new label/hint copy — no new interactive pattern. Thématique 11 (formulaire) is satisfied by the reused DSFR component; the hint text's CNIL link has an explicit accessible name via its visible text. No new violation introduced.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/FileUpload/CampaignDocumentUpload.tsx frontend/src/components/FileUpload/test/CampaignDocumentUpload.test.tsx
git commit -m "feat: add CampaignDocumentUpload component"
```

---

### Task 7: `CampaignDocumentsTab` component

**Files:**

- Create: `frontend/src/components/Campaign/CampaignDocumentsTab.tsx`
- Create: `frontend/src/components/Campaign/test/CampaignDocumentsTab.test.tsx`

**Interfaces:**

- Consumes: `CampaignDocumentUpload` (Task 6), `useFindCampaignDocumentsQuery`/`useLinkDocumentsToCampaignMutation`/`useUnlinkCampaignDocumentMutation` (Task 5), `useUpdateDocumentMutation` (existing), `DocumentCard`, `DocumentFullscreenPreview`, `createDocumentDeleteModal`, `createDocumentRenameModal` (existing, unchanged).
- Produces: `<CampaignDocumentsTab campaign={CampaignDTO} />` — consumed by Task 8.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Campaign/test/CampaignDocumentsTab.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import {
  genDocumentDTO,
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import data from '~/mocks/handlers/data';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { factories } from '~/test/factories';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';

import CampaignDocumentsTab from '../CampaignDocumentsTab';

describe('CampaignDocumentsTab', () => {
  function renderTab(role: UserRole) {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(role, establishment);
    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: auth } });
    data.campaigns.push(campaign);
    const store = configureTestStore({
      auth: genAuthUser(fromUserDTO(auth), fromEstablishmentDTO(establishment))
    });

    render(
      <Provider store={store}>
        <CampaignDocumentsTab campaign={campaign} />
      </Provider>
    );

    return { campaign, establishment, auth };
  }

  it('shows an empty state message when there are no documents', async () => {
    renderTab(UserRole.USUAL);

    expect(
      await screen.findByText(
        /Il n’y a pas de document associé à cette campagne/i
      )
    ).toBeInTheDocument();
  });

  it('displays existing documents', async () => {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: auth } });
    const document = genDocumentDTO(auth, establishment);
    data.campaigns.push(campaign);
    data.documents.set(document.id, document);
    data.campaignDocuments.set(campaign.id, [document]);
    const store = configureTestStore({
      auth: genAuthUser(fromUserDTO(auth), fromEstablishmentDTO(establishment))
    });

    render(
      <Provider store={store}>
        <CampaignDocumentsTab campaign={campaign} />
      </Provider>
    );

    expect(
      await screen.findByText(new RegExp(document.filename, 'i'))
    ).toBeInTheDocument();
  });

  it('shows the upload zone for a usual user', async () => {
    renderTab(UserRole.USUAL);

    expect(
      await screen.findByText(
        'Associez un ou plusieurs documents à cette campagne'
      )
    ).toBeInTheDocument();
  });

  it('hides the upload zone for a visitor', async () => {
    renderTab(UserRole.VISITOR);

    await screen.findByText(/Il n’y a pas de document associé/i);
    expect(
      screen.queryByText('Associez un ou plusieurs documents à cette campagne')
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test frontend -- CampaignDocumentsTab.test.tsx`
Expected: FAIL — cannot find module `../CampaignDocumentsTab`.

- [ ] **Step 3: Implement the component**

Create `frontend/src/components/Campaign/CampaignDocumentsTab.tsx`:

```tsx
import Pictures from '@codegouvfr/react-dsfr/picto/Pictures';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CampaignDTO, DocumentDTO } from '@zerologementvacant/models';
import type { ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import CampaignDocumentUpload from '~/components/FileUpload/CampaignDocumentUpload';
import DocumentFullscreenPreview from '~/components/FileUpload/DocumentFullscreenPreview';
import DocumentCard, {
  type DocumentCardProps
} from '~/components/HousingDetails/DocumentCard';
import { createDocumentDeleteModal } from '~/components/HousingDetails/DocumentDeleteModal';
import { createDocumentRenameModal } from '~/components/HousingDetails/DocumentRenameModal';
import { useNotification } from '~/hooks/useNotification';
import { useUser } from '~/hooks/useUser';
import {
  useFindCampaignDocumentsQuery,
  useLinkDocumentsToCampaignMutation,
  useUnlinkCampaignDocumentMutation,
  useUpdateDocumentMutation
} from '~/services/document.service';

export interface CampaignDocumentsTabProps {
  campaign: CampaignDTO;
}

function CampaignDocumentsTab(props: Readonly<CampaignDocumentsTabProps>) {
  const { campaign } = props;

  const {
    data: documents,
    isLoading,
    isSuccess
  } = useFindCampaignDocumentsQuery(campaign.id);

  const [linkDocuments] = useLinkDocumentsToCampaignMutation();
  function onUpload(uploaded: ReadonlyArray<DocumentDTO>): void {
    linkDocuments({
      campaignId: campaign.id,
      documentIds: uploaded.map((document) => document.id)
    });
  }

  const [updateDocument, updateDocumentMutation] = useUpdateDocumentMutation();
  useNotification({
    toastId: 'document-update',
    isError: updateDocumentMutation.isError,
    isLoading: updateDocumentMutation.isLoading,
    isSuccess: updateDocumentMutation.isSuccess,
    message: {
      error: 'Erreur lors du renommage du document.',
      loading: 'Renommage du document...',
      success: 'Document renommé !'
    }
  });
  function onRename(document: DocumentDTO): void {
    updateDocument({ id: document.id, filename: document.filename });
  }

  const [unlinkDocument, unlinkDocumentMutation] =
    useUnlinkCampaignDocumentMutation();
  useNotification({
    toastId: 'document-delete',
    isError: unlinkDocumentMutation.isError,
    isLoading: unlinkDocumentMutation.isLoading,
    isSuccess: unlinkDocumentMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression du document',
      loading: 'Suppression du document...',
      success: 'Document supprimé !'
    }
  });
  const onDelete: DocumentCardProps['onDelete'] = (document) => {
    unlinkDocument({ campaignId: campaign.id, documentId: document.id });
  };

  const documentRenameModalId = useId();
  const documentRenameModal = useMemo(
    () => createDocumentRenameModal(documentRenameModalId),
    [documentRenameModalId]
  );
  const documentDeleteModalId = useId();
  const documentDeleteModal = useMemo(
    () => createDocumentDeleteModal(documentDeleteModalId),
    [documentDeleteModalId]
  );

  const { isUsual, isAdmin } = useUser();
  const canUpload = isAdmin || isUsual;

  const [selectedDocument, setSelectedDocument] = useState<DocumentDTO | null>(
    null
  );
  const [documentToDelete, setDocumentToDelete] = useState<DocumentDTO | null>(
    null
  );
  const [fullscreenPreviewIndex, setFullscreenPreviewIndex] = useState<
    number | null
  >(null);

  function confirmRename(document: DocumentDTO): void {
    setSelectedDocument(document);
    documentRenameModal.open();
  }

  function cancelRename(): void {
    documentRenameModal.close();
    setSelectedDocument(null);
  }

  function renameDocument(filename: string): void {
    if (!selectedDocument) {
      return;
    }
    onRename({ ...selectedDocument, filename });
    documentRenameModal.close();
    setSelectedDocument(null);
  }

  function onVisualize(index: number): void {
    setFullscreenPreviewIndex(index);
  }

  function confirmDeletion(document: DocumentDTO): void {
    setDocumentToDelete(document);
    documentDeleteModal.open();
  }

  function cancelDeletion(): void {
    setDocumentToDelete(null);
    documentDeleteModal.close();
  }

  function deleteDocument(): void {
    if (!documentToDelete) {
      return;
    }
    onDelete(documentToDelete);
    documentDeleteModal.close();
    setDocumentToDelete(null);
  }

  async function onDownload(document: DocumentDTO): Promise<void> {
    try {
      const response = await fetch(document.url);
      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = document.filename;
      globalThis.document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document', error);
    }
  }

  const documentList = documents ?? [];

  return (
    <>
      <documentRenameModal.Component
        document={selectedDocument}
        onCancel={cancelRename}
        onSubmit={renameDocument}
        onDownload={() => {
          if (selectedDocument) {
            onDownload(selectedDocument);
          }
        }}
      />
      <documentDeleteModal.Component
        onCancel={cancelDeletion}
        onSubmit={deleteDocument}
      />

      {fullscreenPreviewIndex !== null && (
        <DocumentFullscreenPreview
          documents={documentList}
          index={fullscreenPreviewIndex}
          onIndexChange={setFullscreenPreviewIndex}
          open={fullscreenPreviewIndex !== null}
          onClose={() => {
            setFullscreenPreviewIndex(null);
          }}
          onDownload={onDownload}
        />
      )}

      <Stack component="section" spacing="2rem" useFlexGap>
        {canUpload ? (
          <Stack component="header">
            <CampaignDocumentUpload onUpload={onUpload} />
          </Stack>
        ) : null}

        {match({ documents: documentList, isLoading, isSuccess })
          .returnType<ReactNode>()
          .with({ isSuccess: true, documents: [] }, () => (
            <Stack
              component="section"
              spacing="0.75rem"
              useFlexGap
              sx={{ alignItems: 'center', textAlign: 'center' }}
            >
              <Pictures width="7.5rem" height="7.5rem" />
              <Typography
                component="p"
                variant="subtitle2"
                sx={{ fontWeight: 500, width: '17rem' }}
              >
                Il n’y a pas de document associé à cette campagne
              </Typography>
            </Stack>
          ))
          .with(
            {
              isSuccess: true,
              documents: [Pattern.any, ...Pattern.array(Pattern.any)]
            },
            ({ documents }) => (
              <Stack spacing="1rem" useFlexGap>
                <Typography component="h2" variant="h6">
                  Documents ({documents.length})
                </Typography>

                <Grid container spacing="1rem">
                  {documents.map((document, index) => (
                    <Grid key={document.id} size={{ xs: 12, md: 6, xl: 4 }}>
                      <DocumentCard
                        document={document}
                        index={index}
                        onDelete={confirmDeletion}
                        onDownload={onDownload}
                        onRename={confirmRename}
                        onVisualize={onVisualize}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )
          )
          .otherwise(() => null)}
      </Stack>
    </>
  );
}

export default CampaignDocumentsTab;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test frontend -- CampaignDocumentsTab.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: RGAA self-check**

This component reuses `DocumentCard` (Dropdown menu, thématique 7 — already accessible, unchanged), `DocumentFullscreenPreview` (modal lightbox, thématique 7), and the delete/rename modals (thématique 11 for the rename form) exactly as they exist for housing today. No new interactive pattern is introduced. No regression.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Campaign/CampaignDocumentsTab.tsx frontend/src/components/Campaign/test/CampaignDocumentsTab.test.tsx
git commit -m "feat: add CampaignDocumentsTab component"
```

---

### Task 8: Wire into `CampaignView.tsx` + full integration tests

**Files:**

- Modify: `frontend/src/views/Campaign/CampaignView.tsx`
- Modify: `frontend/src/views/Campaign/test/CampaignView.test.tsx`

**Interfaces:**

- Consumes: `CampaignDocumentsTab` (Task 7).
- Produces: the finished "Documents" tab on the campaign detail page.

- [ ] **Step 1: Write the failing integration tests**

Modify `frontend/src/views/Campaign/test/CampaignView.test.tsx`. Update the imports at the top of the file:

```tsx
import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UserRole,
  type CampaignDTO,
  type DocumentDTO,
  type EstablishmentDTO,
  type HousingDTO,
  type UserDTO
} from '@zerologementvacant/models';
import {
  genDocumentDTO,
  genDraftDTO,
  genEstablishmentDTO,
  genHousingDTO,
  genSenderDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { HousingFiltersProvider } from '~/hooks/HousingFiltersContext';
import data from '~/mocks/handlers/data';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { factories } from '~/test/factories';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';
import HousingListView from '~/views/HousingList/HousingListView';

import CampaignView from '../CampaignView';
```

Update the `renderView` helper to seed an authenticated user and accept document/auth overrides:

```tsx
interface RenderViewOptions {
  housings?: HousingDTO[];
  documents?: DocumentDTO[];
  auth?: UserDTO;
  establishment?: EstablishmentDTO;
}

function renderView(campaign: CampaignDTO, options?: RenderViewOptions) {
  data.campaigns.push(campaign);
  if (options?.housings?.length) {
    data.housings.push(...options.housings);
    data.campaignHousings.set(
      campaign.id,
      options.housings.map((h) => ({ id: h.id }))
    );
    options.housings.forEach((housing) => {
      data.housingCampaigns.set(housing.id, [{ id: campaign.id }]);
    });
  }
  if (options?.documents?.length) {
    options.documents.forEach((document) => {
      data.documents.set(document.id, document);
    });
    data.campaignDocuments.set(campaign.id, options.documents);
  }

  const renderAuth = options?.auth ?? auth;
  const renderEstablishment = options?.establishment ?? establishment;

  const router = createMemoryRouter(
    [
      { path: '/campagnes', element: <div>Campagnes</div> },
      { path: '/campagnes/:id', element: <CampaignView /> },
      { path: '/parc-de-logements', element: <HousingListView /> }
    ],
    { initialEntries: [`/campagnes/${campaign.id}`] }
  );

  render(
    <Provider
      store={configureTestStore({
        auth: genAuthUser(
          fromUserDTO(renderAuth),
          fromEstablishmentDTO(renderEstablishment)
        )
      })}
    >
      <HousingFiltersProvider>
        <RouterProvider router={router} />
      </HousingFiltersProvider>
    </Provider>
  );

  return { router };
}
```

Add a new `describe('Documents tab', ...)` block at the end of the file, right before the final closing `});` of `describe('CampaignView', ...)`:

```tsx
describe('Documents tab', () => {
  it('shows an empty state message when there are no documents', async () => {
    const campaign = factories
      .campaign(establishment)
      .build(
        { sentAt: null, returnCount: null },
        { associations: { createdBy: auth } }
      );

    renderView(campaign, { documents: [] });

    await screen.findByRole('heading', { level: 1 });
    const tab = await screen.findByRole('tab', { name: 'Documents' });
    await user.click(tab);
    const tabpanel = await screen.findByRole('tabpanel', {
      name: 'Documents'
    });
    expect(
      await within(tabpanel).findByText(
        /Il n’y a pas de document associé à cette campagne/i
      )
    ).toBeVisible();
  });

  it('displays existing documents', async () => {
    const campaign = factories
      .campaign(establishment)
      .build(
        { sentAt: null, returnCount: null },
        { associations: { createdBy: auth } }
      );
    const document = genDocumentDTO(auth, establishment);

    renderView(campaign, { documents: [document] });

    const tab = await screen.findByRole('tab', { name: 'Documents' });
    await user.click(tab);
    const tabpanel = await screen.findByRole('tabpanel', {
      name: 'Documents'
    });
    expect(
      await within(tabpanel).findByText(new RegExp(document.filename, 'i'))
    ).toBeVisible();
  });

  it('renames a document', async () => {
    const campaign = factories
      .campaign(establishment)
      .build(
        { sentAt: null, returnCount: null },
        { associations: { createdBy: auth } }
      );
    const document = genDocumentDTO(auth, establishment);

    renderView(campaign, { documents: [document] });

    const tab = await screen.findByRole('tab', { name: 'Documents' });
    await user.click(tab);
    const tabpanel = await screen.findByRole('tabpanel', {
      name: 'Documents'
    });
    const dropdown = await within(tabpanel).findByRole('button', {
      name: 'Options'
    });
    await user.click(dropdown);
    const renameButton = await screen.findByRole('button', {
      name: 'Renommer'
    });
    await user.click(renameButton);
    const modal = await screen.findByRole('dialog', {
      name: 'Renommer le document'
    });
    const input = await within(modal).findByRole('textbox', {
      name: /^Nouveau nom du document/
    });
    await user.clear(input);
    await user.type(input, 'nouveau-nom-campagne.pdf');
    const save = await within(modal).findByRole('button', {
      name: 'Confirmer'
    });
    await user.click(save);

    expect(
      await within(tabpanel).findByText('nouveau-nom-campagne.pdf')
    ).toBeVisible();
  });

  it('deletes a document', async () => {
    const campaign = factories
      .campaign(establishment)
      .build(
        { sentAt: null, returnCount: null },
        { associations: { createdBy: auth } }
      );
    const document = genDocumentDTO(auth, establishment);

    renderView(campaign, { documents: [document] });

    const tab = await screen.findByRole('tab', { name: 'Documents' });
    await user.click(tab);
    const tabpanel = await screen.findByRole('tabpanel', {
      name: 'Documents'
    });
    const dropdown = await within(tabpanel).findByRole('button', {
      name: 'Options'
    });
    await user.click(dropdown);
    const deleteButton = await screen.findByRole('button', {
      name: 'Supprimer'
    });
    await user.click(deleteButton);
    const modal = await screen.findByRole('dialog', {
      name: 'Suppression du document'
    });
    const confirm = await within(modal).findByRole('button', {
      name: 'Confirmer'
    });
    await user.click(confirm);

    expect(
      within(tabpanel).queryByText(new RegExp(document.filename, 'i'))
    ).not.toBeInTheDocument();
  });

  it('hides rename and delete for a visitor', async () => {
    const campaign = factories
      .campaign(establishment)
      .build(
        { sentAt: null, returnCount: null },
        { associations: { createdBy: auth } }
      );
    const document = genDocumentDTO(auth, establishment);
    const visitor = genUserDTO(UserRole.VISITOR, establishment);

    renderView(campaign, { documents: [document], auth: visitor });

    const tab = await screen.findByRole('tab', { name: 'Documents' });
    await user.click(tab);
    const tabpanel = await screen.findByRole('tabpanel', {
      name: 'Documents'
    });
    const dropdown = await within(tabpanel).findByRole('button', {
      name: 'Options'
    });
    await user.click(dropdown);

    expect(
      screen.queryByRole('button', { name: 'Renommer' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Supprimer' })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn nx test frontend -- CampaignView.test.tsx`
Expected: FAIL on the new "Documents tab" tests — no "Documents" tab exists yet in `CampaignView.tsx`.

- [ ] **Step 3: Wire the tab into `CampaignView.tsx`**

Modify `frontend/src/views/Campaign/CampaignView.tsx` — add the lazy import near the existing ones (after `DraftForm`):

```tsx
const CampaignRecipientsNext = lazy(
  () => import('~/components/Campaign/CampaignRecipients')
);
const DraftForm = lazy(() => import('~/components/Draft/DraftForm'));
const CampaignDocumentsTabLazy = lazy(
  () => import('~/components/Campaign/CampaignDocumentsTab')
);
```

Add the third tab entry to the `Tabs` `tabs` array:

```tsx
<Suspense>
  <Tabs
    tabs={[
      {
        label: 'Destinataires',
        content: <CampaignRecipientsNext campaign={campaign} />
      },
      {
        label: 'Courrier',
        content:
          getCampaignDraftQuery.isSuccess && getCampaignDraftQuery.data ? (
            <DraftForm campaign={campaign} draft={getCampaignDraftQuery.data} />
          ) : null
      },
      {
        label: 'Documents',
        content: <CampaignDocumentsTabLazy campaign={campaign} />
      }
    ]}
  />
</Suspense>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn nx test frontend -- CampaignView.test.tsx`
Expected: PASS — all pre-existing tests (title, breadcrumb, sentAt modal, delete modal, "Voir les logements", Courrier tab) plus the new "Documents tab" describe block.

- [ ] **Step 5: Regression-verify the shared permission helper and full suite**

Run: `yarn nx test frontend -- HousingView.test.tsx` (expected: PASS — confirms `canWriteDocument` still gates housing documents correctly)
Run: `yarn nx test frontend -- CampaignDocumentUpload.test.tsx CampaignDocumentsTab.test.tsx CampaignView.test.tsx` (expected: PASS)
Run: `yarn nx test server -- document-api.test.ts campaignDocumentRepository.test.ts` (expected: PASS)
Run: `yarn nx run-many -t typecheck` (expected: no errors)
Run: `yarn nx run-many -t lint` (expected: no errors — this also confirms the previously-unused `visitor` fixture in `document-api.test.ts` is now used)

- [ ] **Step 6: Manual verification against the Figma design**

Start the dev servers (`yarn workspace @zerologementvacant/server dev` and `yarn workspace @zerologementvacant/front dev`), open a campaign detail page, click the "Documents" tab, and confirm:

- Tab order matches the Figma design (Destinataires, Courrier, Documents).
- Upload zone copy and layout match the Figma screenshot (`node 16628:13904`).
- Uploading a file shows it immediately in the "Documents (N)" grid.
- Options menu (Visualiser/Renommer/Télécharger/Supprimer) works per document.
- A `VISITOR`-role user sees the documents but not the upload zone or the Renommer/Supprimer actions.

- [ ] **Step 7: RGAA final self-check**

Confirm via manual keyboard navigation: Tab into the new "Documents" tab (DSFR `Tabs`, thématique 7/12.8 — arrow-key navigation between tabs, visible focus per 10.7), Tab into the upload zone (native `<input type="file">`, thématique 11), Tab into a document card's "Options" dropdown and operate it fully via keyboard (Enter to open, arrow keys/Tab through items, Escape to close — thématique 7). No new component was built from scratch, so no new violation is expected; report the result.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/Campaign/CampaignView.tsx frontend/src/views/Campaign/test/CampaignView.test.tsx
git commit -m "feat: wire Documents tab into CampaignView"
```

---

## Post-plan: PR

Per `.claude/rules` and root `CLAUDE.md`: push the branch, open a PR with a summary (link the design spec and this plan), then add labels and assign via `gh pr edit <number> --add-label "<labels>" --add-assignee "@me"`. Do this only when explicitly requested — not automatically at the end of this plan.
