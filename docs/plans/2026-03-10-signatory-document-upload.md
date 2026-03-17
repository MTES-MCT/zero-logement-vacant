# Signatory Document Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace inline S3-key signatory file storage with the `documents` table upload pipeline, following the same expand-and-contract pattern used for housing documents, guarded by the `new-campaigns` feature flag on both frontend and backend.

**Architecture:** Upload files via `POST /documents` → store `document_id` FK on `senders` → join `documents` into draft/sender select queries (no manual `findOne` in repositories). New `POST /drafts` and `PUT /drafts/:id` handlers typed as `RequestHandler` use `DraftCreationPayload` / `DraftUpdatePayload` schemas and are gated by the `new-campaigns` PostHog flag. `DocumentDTO` conversion (presigned URL) happens in the controller. Old handlers are untouched. `DraftForm` is already the new path — no extra flag indirection needed in the view.

**Tech Stack:** TypeScript, Express, Knex, PostgreSQL, RTK Query, react-hook-form, Yup, PostHog feature flags, Vitest + supertest, MSW

---

## Already Done (do not redo)

- `packages/models/src/SenderDTO.ts` — `SignatoryDTO.document: DocumentDTO | null`; `SignatoryPayload`, `SenderPayload` types; `SenderPayloadDTO` deprecated
- `packages/models/src/DraftDTO.ts` — `DraftDTO.logoNext`; `DraftCreationPayload`, `DraftUpdatePayload` types; legacy types deprecated
- `packages/schemas/src/draft-creation-payload.ts` — `draftCreationPayload` with `logo` tuple + `signatories` coercion
- `packages/schemas/src/draft-update-payload.ts` — `draftUpdatePayload` omits `campaign`
- `packages/schemas/src/draft.ts` — `document` field added to legacy `signatory` schema
- `packages/models/src/test/fixtures.ts` and `SenderDTO.test.ts` — updated

**Verify before starting:**
```bash
yarn nx typecheck schemas
```
Expected: ✅ success

---

## Task 1: Schema property-based tests

**Files:**
- Create: `packages/schemas/src/test/draft-creation-payload.test.ts`
- Create: `packages/schemas/src/test/draft-update-payload.test.ts`

**Context:** Backend conventions require property-based tests for all Yup schemas. Use `@fast-check/vitest`. These tests must be written before the API handler tests.

**Step 1: Check existing schema test structure**
```bash
ls packages/schemas/src/test/
```

**Step 2: Write the failing tests for `draftCreationPayload`**

`packages/schemas/src/test/draft-creation-payload.test.ts`:
```typescript
import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';
import { draftCreationPayload } from '../draft-creation-payload';
import { DraftCreationPayload } from '@zerologementvacant/models';

describe('draftCreationPayload', () => {
  describe('logo', () => {
    test.prop([fc.constant(undefined)])('coerces undefined to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({ campaign: crypto.randomUUID(), logo: value });
      expect(result.logo).toStrictEqual([null, null]);
    });

    test.prop([fc.constant(null)])('coerces null to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({ campaign: crypto.randomUUID(), logo: value });
      expect(result.logo).toStrictEqual([null, null]);
    });

    test.prop([
      fc.tuple(
        fc.option(fc.uuid({ version: 4 })),
        fc.option(fc.uuid({ version: 4 }))
      )
    ])('accepts a tuple of two optional UUIDs', async ([a, b]) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        logo: [a, b]
      });
      expect(result.logo).toStrictEqual([a ?? null, b ?? null]);
    });
  });

  describe('sender.signatories', () => {
    test.prop([fc.constant(undefined)])('coerces undefined to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: { signatories: value }
      });
      expect(result.sender?.signatories).toStrictEqual([null, null]);
    });

    test.prop([fc.constant(null)])('coerces null to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: { signatories: value }
      });
      expect(result.sender?.signatories).toStrictEqual([null, null]);
    });

    test.prop([fc.constant([null, null])])('accepts [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: { signatories: value }
      });
      expect(result.sender?.signatories).toStrictEqual([null, null]);
    });
  });

  describe('sender.signatories[*].document', () => {
    test.prop([fc.uuid({ version: 4 })])('accepts a UUID document ID', async (docId) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: {
          signatories: [
            { firstName: 'Alice', lastName: 'Dupont', role: 'Maire', document: docId },
            null
          ]
        }
      });
      expect(result.sender?.signatories?.[0]?.document).toBe(docId);
    });

    test.prop([fc.constant('not-a-uuid')])('rejects non-UUID document ID', async (badId) => {
      await expect(
        draftCreationPayload.validate({
          campaign: crypto.randomUUID(),
          sender: {
            signatories: [{ document: badId }, null]
          }
        })
      ).rejects.toThrow();
    });
  });
});
```

**Step 3: Write the failing tests for `draftUpdatePayload`**

`packages/schemas/src/test/draft-update-payload.test.ts`:
```typescript
import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';
import { draftUpdatePayload } from '../draft-update-payload';

describe('draftUpdatePayload', () => {
  test.prop([fc.uuid({ version: 4 })])('rejects payload with campaign field', async (campaignId) => {
    // campaign is stripped by omit — it should be ignored/stripped, not rejected
    const result = await draftUpdatePayload.validate({ campaign: campaignId });
    expect((result as any).campaign).toBeUndefined();
  });

  test.prop([fc.constant(undefined)])('coerces missing logo to [null, null]', async (value) => {
    const result = await draftUpdatePayload.validate({ logo: value });
    expect(result.logo).toStrictEqual([null, null]);
  });
});
```

**Step 4: Run the tests to verify they pass**
```bash
yarn nx test schemas -- draft-creation-payload
yarn nx test schemas -- draft-update-payload
```
Expected: ✅ all pass

**Step 5: Commit**
```bash
git add packages/schemas/src/test/draft-creation-payload.test.ts \
        packages/schemas/src/test/draft-update-payload.test.ts
git commit -m "test(schemas): add property-based tests for draftCreationPayload and draftUpdatePayload"
```

---

## Task 2: DB migration — add FK columns to `senders` and `drafts`

**Files:**
- Create: `server/src/infra/database/migrations/20260310000001_senders-add-signatory-document-id.ts`
- Create: `server/src/infra/database/migrations/20260310000002_drafts-add-logo-next.ts`

### Task 2a: Sender migration

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table
      .uuid('signatory_one_document_id')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
    table
      .uuid('signatory_two_document_id')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.dropColumn('signatory_one_document_id');
    table.dropColumn('signatory_two_document_id');
  });
}
```

### Task 2b: Draft migration

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table
      .uuid('logo_next_one')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
    table
      .uuid('logo_next_two')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.dropColumn('logo_next_one');
    table.dropColumn('logo_next_two');
  });
}
```

**Step: Run migrations**
```bash
yarn workspace @zerologementvacant/server migrate
```
Expected: ✅ both migrations applied

**Step: Commit**
```bash
git add server/src/infra/database/migrations/
git commit -m "feat(server): add signatory document FK columns to senders and logo FK to drafts"
```

---

## Task 3: Expand `SenderDBO` and repository — join-based document resolution

**Files:**
- Modify: `server/src/repositories/senderRepository.ts`

**Context:** Do NOT call `documentRepository.findOne` in `parseSenderApi`. Instead, join `documents` into the sender query. The `SenderDBO` will carry the joined document rows. `parseSenderApi` becomes a pure sync transformation once the data is joined in.

**Step 1: Understand the current join structure**

Currently `senderRepository` is used by `draftRepository` via `to_json(senders.*)`. The join happens in `draftRepository.listQuery`. We need to extend the joined sender JSON to also include the document rows, or join them separately in `draftRepository`.

**Architecture decision:** Join documents directly in `draftRepository.listQuery` alongside the sender. Add two left joins on `documents` (one for each signatory document). Include the document rows as `signatory_one_document` and `signatory_two_document` JSON columns.

**Step 2: Add new columns to `SenderDBO`**

```typescript
export interface SenderDBO {
  // ... existing fields ...
  signatory_one_document_id: string | null;
  signatory_two_document_id: string | null;
}
```

**Step 3: Update `formatSenderApi`**

Add to the returned object:
```typescript
signatory_one_document_id: sender.signatories?.[0]?.document?.id ?? null,
signatory_two_document_id: sender.signatories?.[1]?.document?.id ?? null,
```

Add to the `.merge([...])` list in `save`:
```
'signatory_one_document_id',
'signatory_two_document_id',
```

**Step 4: Update `parseSenderApi` signature**

`parseSenderApi` currently downloads S3 files and is `async`. Refactor it to also accept joined document data. Add an optional second parameter:

```typescript
export interface SenderJoinedDocuments {
  signatoryOneDocument: DocumentDBO | null;
  signatoryTwoDocument: DocumentDBO | null;
}

export const parseSenderApi = async (
  sender: SenderDBO,
  joinedDocuments?: SenderJoinedDocuments
): Promise<SenderApi> => {
  // ... existing S3 downloads for file ...

  return {
    // ... existing fields ...
    signatories: [
      {
        firstName: sender.signatory_one_first_name,
        lastName: sender.signatory_one_last_name,
        role: sender.signatory_one_role,
        file: signatory_one_file,
        document: joinedDocuments?.signatoryOneDocument
          ? parseDocumentDBO(joinedDocuments.signatoryOneDocument)
          : null
      }
      {
        // same for second signatory
      }
    ]
  };
};
```

Where `parseDocumentDBO` converts `DocumentDBO` → `DocumentApi` (without presigned URL yet — that's done in the controller). Define it or import it from `documentRepository`.

**Step 5: Update `genSenderApi` in `server/src/test/testFixtures.ts`**

Add `document: null` to both signatories:
```typescript
signatories: [
  { firstName: ..., lastName: ..., role: ..., file: null, document: null },
  { firstName: ..., lastName: ..., role: ..., file: null, document: null }
],
```

**Step 6: Typecheck**
```bash
yarn nx typecheck server
```

**Step 7: Commit**
```bash
git add server/src/repositories/senderRepository.ts \
        server/src/test/testFixtures.ts
git commit -m "feat(server): expand SenderDBO with signatory document FK columns"
```

---

## Task 4: Expand `DraftDBO` + `DraftApi` — join document rows

**Files:**
- Modify: `server/src/repositories/draftRepository.ts`
- Modify: `server/src/models/DraftApi.ts`

**Context:** `draftRepository.listQuery` joins `senders`. Extend it to also left-join the two signatory document rows and the two logo document rows. Pass the joined data to `parseSenderApi`.

**Step 1: Define `DocumentDBO` import**

`DocumentDBO` is defined in `documentRepository.ts`. Export it from there if not already exported.

**Step 2: Add `logoNext` to `DraftApi`**

```typescript
export interface DraftApi extends Omit<DraftDTO, 'sender'> {
  establishmentId: string;
  senderId: string;
  sender: SenderApi;
  // logoNext is already on DraftDTO — inherited
}
```

Verify `DraftDTO.logoNext` is `[DocumentDTO | null, DocumentDTO | null]` — it is (already done).

**Step 3: Add columns to `DraftRecordDBO`**

```typescript
export interface DraftRecordDBO {
  // ... existing fields ...
  logo_next_one: string | null;
  logo_next_two: string | null;
}
```

**Step 4: Update `DraftDBO` with joined document columns**

```typescript
export interface DraftDBO extends DraftRecordDBO {
  sender: SenderDBO;
  signatory_one_doc: DocumentDBO | null;   // joined
  signatory_two_doc: DocumentDBO | null;   // joined
  logo_next_one_doc: DocumentDBO | null;   // joined
  logo_next_two_doc: DocumentDBO | null;   // joined
}
```

**Step 5: Update `listQuery` to left-join all 4 document rows**

```typescript
function listQuery(query: Knex.QueryBuilder): void {
  query
    .select(`${draftsTable}.*`)
    .leftJoin<SenderDBO>(
      sendersTable,
      `${draftsTable}.sender_id`,
      `${sendersTable}.id`
    )
    .select(db.raw(`to_json(${sendersTable}.*) AS sender`))
    // signatory documents
    .leftJoin(
      { signatory_one_doc: 'documents' },
      `${sendersTable}.signatory_one_document_id`,
      'signatory_one_doc.id'
    )
    .select(db.raw(`to_json(signatory_one_doc.*) AS signatory_one_doc`))
    .leftJoin(
      { signatory_two_doc: 'documents' },
      `${sendersTable}.signatory_two_document_id`,
      'signatory_two_doc.id'
    )
    .select(db.raw(`to_json(signatory_two_doc.*) AS signatory_two_doc`))
    // logo next documents
    .leftJoin(
      { logo_next_one_doc: 'documents' },
      `${draftsTable}.logo_next_one`,
      'logo_next_one_doc.id'
    )
    .select(db.raw(`to_json(logo_next_one_doc.*) AS logo_next_one_doc`))
    .leftJoin(
      { logo_next_two_doc: 'documents' },
      `${draftsTable}.logo_next_two`,
      'logo_next_two_doc.id'
    )
    .select(db.raw(`to_json(logo_next_two_doc.*) AS logo_next_two_doc`));
}
```

**Step 6: Update `formatDraftApi`**

```typescript
export const formatDraftApi = (draft: DraftApi): DraftRecordDBO => ({
  // ... existing fields ...
  logo_next_one: draft.logoNext?.[0]?.id ?? null,
  logo_next_two: draft.logoNext?.[1]?.id ?? null,
});
```

Add to the `save` merge list: `'logo_next_one'`, `'logo_next_two'`.

**Step 7: Update `parseDraftApi`**

```typescript
export const parseDraftApi = async (draft: DraftDBO): Promise<DraftApi> => {
  // ... existing logo S3 download ...

  return {
    // ... existing fields ...
    logoNext: [
      draft.logo_next_one_doc ? parseDocumentDBO(draft.logo_next_one_doc) : null,
      draft.logo_next_two_doc ? parseDocumentDBO(draft.logo_next_two_doc) : null
    ],
    sender: await parseSenderApi(draft.sender, {
      signatoryOneDocument: draft.signatory_one_doc,
      signatoryTwoDocument: draft.signatory_two_doc
    })
  };
};
```

**Note:** `parseDocumentDBO` returns a `DocumentApi` without a presigned URL (`url: ''`). The presigned URL is added in the controller when needed (only `preview` needs it for the PDF). For read endpoints the DTO is built there.

**Step 8: Update `genDraftApi` in `testFixtures.ts`**

```typescript
logoNext: [null, null],
```

**Step 9: Typecheck**
```bash
yarn nx typecheck server
```

**Step 10: Commit**
```bash
git add server/src/repositories/draftRepository.ts \
        server/src/models/DraftApi.ts \
        server/src/test/testFixtures.ts
git commit -m "feat(server): join document rows into draft query for logoNext and signatory docs"
```

---

## Task 5: Update `toDraftDTO` to include `logoNext`

**Files:**
- Modify: `server/src/models/DraftApi.ts`

**Context:** `toDraftDTO` currently doesn't map `logoNext`. Since `parseDraftApi` returns `DocumentApi` (no presigned URL) for the joined docs, and the controller needs to hydrate URLs, this step explains how to wire it.

**Two-level conversion:**
1. `parseDraftApi` → `DraftApi` where `logoNext: [DocumentApi | null, DocumentApi | null]` (raw, no URL)
2. In `draftController`, after fetching, generate presigned URLs and call `toDraftDTO`

**OR** (simpler approach): generate presigned URLs in `parseDraftApi` for the joined documents — but this adds S3 calls to every repository read. **Recommended:** Keep `parseDraftApi` simple, add URL generation in the controller for the new `list` and `get` endpoints. The old `list` endpoint doesn't need `logoNext` since old clients don't use it.

For now, `toDraftDTO` can return `logoNext: [null, null]` as a safe default — the new controller handlers will build the DTO directly from `DraftApi` after adding presigned URLs.

**Step 1: Update `toDraftDTO`**

```typescript
export function toDraftDTO(draft: DraftApi, logoNextUrls?: [string, string]): DraftDTO {
  return {
    id: draft.id,
    subject: draft.subject,
    body: draft.body,
    logo: draft.logo,
    logoNext: [
      draft.logoNext?.[0]
        ? { ...toDocumentDTO(draft.logoNext[0], logoNextUrls?.[0] ?? '') }
        : null,
      draft.logoNext?.[1]
        ? { ...toDocumentDTO(draft.logoNext[1], logoNextUrls?.[1] ?? '') }
        : null
    ],
    sender: toSenderDTO(draft.sender),
    writtenAt: draft.writtenAt,
    writtenFrom: draft.writtenFrom,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt
  };
}
```

Import `toDocumentDTO` from `~/models/DocumentApi`.

**Step 2: Update `toSenderDTO` similarly for signatory documents**

In `server/src/models/SenderApi.ts`, `toSenderDTO` currently maps `signatories` directly. Extend it to map the `document` field via `toDocumentDTO`:

```typescript
export function toSenderDTO(sender: SenderApi, signatoryUrls?: [string | null, string | null]): SenderDTO {
  return {
    // ...
    signatories: sender.signatories
      ? [
          sender.signatories[0]
            ? {
                ...sender.signatories[0],
                document: sender.signatories[0].document
                  ? toDocumentDTO(sender.signatories[0].document, signatoryUrls?.[0] ?? '')
                  : null
              }
            : null,
          sender.signatories[1]
            ? {
                ...sender.signatories[1],
                document: sender.signatories[1].document
                  ? toDocumentDTO(sender.signatories[1].document, signatoryUrls?.[1] ?? '')
                  : null
              }
            : null
        ]
      : null
  };
}
```

**Step 3: Typecheck**
```bash
yarn nx typecheck server
```

**Step 4: Commit**
```bash
git add server/src/models/DraftApi.ts server/src/models/SenderApi.ts
git commit -m "feat(server): update toDraftDTO and toSenderDTO to map logoNext and signatory documents"
```

---

## Task 6: New `createNext` and `updateNext` handlers + rename test file

**Files:**
- Modify: `server/src/controllers/draftController.ts`
- Rename: `server/src/controllers/test/draftController.test.ts` → `server/src/controllers/test/draft-api.test.ts`

**Step 1: Rename the test file**
```bash
git mv server/src/controllers/test/draftController.test.ts \
        server/src/controllers/test/draft-api.test.ts
```

**Step 2: Write failing tests for `createNext` (add to `draft-api.test.ts`)**

Add a new `describe` block (after existing `PUT /drafts/{id}` block):

```typescript
import * as posthogService from '~/services/posthogService';
import { DraftCreationPayload, DraftUpdatePayload } from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
// Import Documents table accessor from documentRepository
import { Documents, formatDocumentApi } from '../../repositories/documentRepository';
import { genDocumentApi } from '../../test/testFixtures';

describe('POST /api/drafts — new-campaigns', () => {
  const testRoute = '/api/drafts';
  let campaign: CampaignApi;

  beforeEach(async () => {
    vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);
    campaign = genCampaignApi(establishment.id, user);
    await Campaigns().insert(formatCampaignApi(campaign));
  });

  afterEach(() => vi.restoreAllMocks());

  it('should fall back to legacy handler when flag is off', async () => {
    vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);
    const payload = { campaign: campaign.id, logo: [], sender: null };
    const { status } = await request(url).post(testRoute).send(payload).use(tokenProvider(user));
    expect(status).toBe(constants.HTTP_STATUS_CREATED);
  });

  it('should create a draft with logoNext [null, null] and signatories [null, null]', async () => {
    const payload: DraftCreationPayload = {
      campaign: campaign.id,
      subject: 'Test',
      body: 'Body',
      logo: [null, null],
      writtenAt: null,
      writtenFrom: null,
      sender: { name: 'Mairie', service: null, firstName: null, lastName: null,
                address: null, email: null, phone: null, signatories: [null, null] }
    };

    const { body, status } = await request(url)
      .post(testRoute).send(payload).use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_CREATED);
    expect(body).toMatchObject({ logoNext: [null, null] });

    const actualSender = await Senders().where({ id: body.sender.id }).first();
    expect(actualSender.signatory_one_document_id).toBeNull();
    expect(actualSender.signatory_two_document_id).toBeNull();

    const actualDraft = await Drafts().where({ id: body.id }).first();
    expect(actualDraft.logo_next_one).toBeNull();
    expect(actualDraft.logo_next_two).toBeNull();
  });

  it('should link signatory document', async () => {
    const document = genDocumentApi(establishment, user);
    await Documents().insert(formatDocumentApi(document));

    const payload: DraftCreationPayload = {
      campaign: campaign.id,
      subject: null,
      body: null,
      logo: [null, null],
      writtenAt: null,
      writtenFrom: null,
      sender: {
        name: null, service: null, firstName: null, lastName: null,
        address: null, email: null, phone: null,
        signatories: [
          { firstName: 'Alice', lastName: 'Dupont', role: 'Maire', document: document.id },
          null
        ]
      }
    };

    const { body, status } = await request(url)
      .post(testRoute).send(payload).use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_CREATED);

    const actualSender = await Senders().where({ id: body.sender.id }).first();
    expect(actualSender.signatory_one_document_id).toBe(document.id);
    expect(actualSender.signatory_two_document_id).toBeNull();
  });

  it('should link logo documents', async () => {
    const logoDoc = genDocumentApi(establishment, user);
    await Documents().insert(formatDocumentApi(logoDoc));

    const payload: DraftCreationPayload = {
      campaign: campaign.id,
      subject: null, body: null,
      logo: [logoDoc.id, null],
      writtenAt: null, writtenFrom: null, sender: null
    };

    const { body, status } = await request(url)
      .post(testRoute).send(payload).use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_CREATED);

    const actualDraft = await Drafts().where({ id: body.id }).first();
    expect(actualDraft.logo_next_one).toBe(logoDoc.id);
    expect(actualDraft.logo_next_two).toBeNull();
  });
});

describe('PUT /api/drafts/:id — new-campaigns', () => {
  const testRoute = (id: string) => `/api/drafts/${id}`;
  let draft: DraftApi;
  let sender: SenderApi;

  beforeEach(async () => {
    vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);
    sender = genSenderApi(establishment);
    draft = genDraftApi(establishment, sender);
    await Senders().insert(formatSenderApi(sender));
    await Drafts().insert(formatDraftApi(draft));
  });

  afterEach(() => vi.restoreAllMocks());

  it('should update logoNext and signatory document', async () => {
    const document = genDocumentApi(establishment, user);
    await Documents().insert(formatDocumentApi(document));

    const payload: DraftUpdatePayload = {
      id: draft.id,
      subject: 'Updated',
      body: null,
      logo: [document.id, null],
      writtenAt: null,
      writtenFrom: null,
      sender: {
        name: null, service: null, firstName: null, lastName: null,
        address: null, email: null, phone: null,
        signatories: [
          { firstName: 'Bob', lastName: 'Martin', role: 'DGA', document: document.id },
          null
        ]
      }
    };

    const { body, status } = await request(url)
      .put(testRoute(draft.id)).send(payload).use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);

    const actualDraft = await Drafts().where({ id: draft.id }).first();
    expect(actualDraft.logo_next_one).toBe(document.id);

    const actualSender = await Senders().where({ id: body.sender.id }).first();
    expect(actualSender.signatory_one_document_id).toBe(document.id);
  });

  it('should fall back to legacy when flag is off', async () => {
    vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);
    const payload = { id: draft.id, subject: 'Old', body: null, logo: [],
                      writtenAt: null, writtenFrom: null,
                      sender: { name: null, service: null, firstName: null, lastName: null,
                                address: null, email: null, phone: null, signatories: null } };
    const { status } = await request(url)
      .put(testRoute(draft.id)).send(payload).use(tokenProvider(user));
    expect(status).toBe(constants.HTTP_STATUS_OK);
  });
});
```

**Step 3: Run tests to verify they fail**
```bash
yarn nx test server -- draft-api
```
Expected: FAIL — routes don't exist yet.

**Step 4: Implement `createNext` and `updateNext`**

In `draftController.ts`, add these imports:
```typescript
import { RequestHandler } from 'express';
import { DraftCreationPayload, DraftUpdatePayload, DocumentDTO, SignatoryDTO, SignatoriesDTO } from '@zerologementvacant/models';
import documentRepository from '~/repositories/documentRepository';
import { toDocumentDTO, DocumentApi } from '~/models/DocumentApi';
import { generatePresignedUrl, createS3 } from '@zerologementvacant/utils/node';
```

Extract a helper to resolve document IDs → presigned `DocumentDTO`:
```typescript
async function resolveDocuments(
  ids: ReadonlyArray<string | null>,
  establishmentId: string
): Promise<Map<string, DocumentDTO>> {
  const validIds = ids.filter(Boolean) as string[];
  if (!validIds.length) return new Map();

  const docs = await documentRepository.find({
    filters: { ids: validIds, establishmentIds: [establishmentId], deleted: false }
  });

  const map = new Map<string, DocumentDTO>();
  for (const doc of docs) {
    const url = await generatePresignedUrl({ s3, bucket: config.s3.bucket, key: doc.s3Key });
    map.set(doc.id, toDocumentDTO(doc, url));
  }
  return map;
}
```

Then implement `createNext`:
```typescript
const createNext: RequestHandler<never, DraftDTO, DraftCreationPayload, never> = async (
  request,
  response
): Promise<void> => {
  const { auth, body } = request as AuthenticatedRequest<never, DraftDTO, DraftCreationPayload, never>;

  const campaign = await campaignRepository.findOne({
    id: body.campaign,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(body.campaign);
  }

  // Gather all document IDs to resolve
  const allDocIds = [
    body.logo[0], body.logo[1],
    body.sender?.signatories?.[0]?.document ?? null,
    body.sender?.signatories?.[1]?.document ?? null
  ];
  const docsMap = await resolveDocuments(allDocIds, auth.establishmentId);

  const logoNext: [DocumentDTO | null, DocumentDTO | null] = [
    body.logo[0] ? (docsMap.get(body.logo[0]) ?? null) : null,
    body.logo[1] ? (docsMap.get(body.logo[1]) ?? null) : null
  ];

  function buildSignatory(payload: SignatoryPayload | null | undefined): SignatoryDTO | null {
    if (!payload) return null;
    return {
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      file: null,
      document: payload.document ? (docsMap.get(payload.document) ?? null) : null
    };
  }

  const signatories: SignatoriesDTO = [
    buildSignatory(body.sender?.signatories?.[0]),
    buildSignatory(body.sender?.signatories?.[1])
  ];

  const sender: SenderApi = {
    id: uuidv4(),
    name: body.sender?.name ?? null,
    service: body.sender?.service ?? null,
    firstName: body.sender?.firstName ?? null,
    lastName: body.sender?.lastName ?? null,
    address: body.sender?.address ?? null,
    email: body.sender?.email ?? null,
    phone: body.sender?.phone ?? null,
    signatories,
    establishmentId: auth.establishmentId,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON()
  };

  const draft: DraftApi = {
    id: uuidv4(),
    subject: body.subject,
    body: body.body,
    logo: null,
    logoNext,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    establishmentId: auth.establishmentId
  };

  await senderRepository.save(sender);
  await draftRepository.save(draft);
  await campaignDraftRepository.save(campaign, draft);

  response.status(constants.HTTP_STATUS_CREATED).json(toDraftDTO(draft));
};
```

Implement `updateNext` analogously (same logic, different entry point):
```typescript
const updateNext: RequestHandler<DraftParams, DraftDTO, DraftUpdatePayload, never> = async (
  request,
  response
): Promise<void> => {
  const { auth, params, body } = request as AuthenticatedRequest<DraftParams, DraftDTO, DraftUpdatePayload, never>;

  const draft = await draftRepository.findOne({ id: params.id, establishmentId: auth.establishmentId });
  if (!draft) throw new DraftMissingError(params.id);

  const allDocIds = [
    body.logo[0], body.logo[1],
    body.sender?.signatories?.[0]?.document ?? null,
    body.sender?.signatories?.[1]?.document ?? null
  ];
  const docsMap = await resolveDocuments(allDocIds, auth.establishmentId);

  const logoNext: [DocumentDTO | null, DocumentDTO | null] = [
    body.logo[0] ? (docsMap.get(body.logo[0]) ?? null) : null,
    body.logo[1] ? (docsMap.get(body.logo[1]) ?? null) : null
  ];

  function buildSignatory(payload: SignatoryPayload | null | undefined): SignatoryDTO | null {
    if (!payload) return null;
    return {
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      file: null,
      document: payload.document ? (docsMap.get(payload.document) ?? null) : null
    };
  }

  const sender: SenderApi = {
    id: draft.sender.id,
    name: body.sender?.name ?? null,
    service: body.sender?.service ?? null,
    firstName: body.sender?.firstName ?? null,
    lastName: body.sender?.lastName ?? null,
    address: body.sender?.address ?? null,
    email: body.sender?.email ?? null,
    phone: body.sender?.phone ?? null,
    signatories: [
      buildSignatory(body.sender?.signatories?.[0]),
      buildSignatory(body.sender?.signatories?.[1])
    ],
    createdAt: draft.sender.createdAt,
    updatedAt: new Date().toJSON(),
    establishmentId: draft.sender.establishmentId
  };

  const updated: DraftApi = {
    ...draft,
    subject: body.subject,
    body: body.body,
    logo: null,
    logoNext,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    updatedAt: new Date().toJSON()
  };

  await senderRepository.save(sender);
  await draftRepository.save(updated);

  response.status(constants.HTTP_STATUS_OK).json(toDraftDTO(updated));
};
```

Export both from `draftController`.

**Step 5: Wire routes in `protected.ts`**

Add the flag-gated routes **before** the legacy ones (same pattern as `PUT /campaigns/:id`).

For `POST /drafts`:
```typescript
router.post(
  '/drafts',
  async (req, res, next) => {
    const { auth } = req as AuthenticatedRequest;
    const enabled = await isFeatureEnabled('new-campaigns', auth.establishmentId);
    if (!enabled) return next('route');
    next();
  },
  validatorNext.validate({ body: schemas.draftCreationPayload }),
  draftController.createNext
);
// existing legacy route follows immediately
```

For `PUT /drafts/:id`:
```typescript
router.put(
  '/drafts/:id',
  async (req, res, next) => {
    const { auth } = req as AuthenticatedRequest;
    const enabled = await isFeatureEnabled('new-campaigns', auth.establishmentId);
    if (!enabled) return next('route');
    next();
  },
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.draftUpdatePayload
  }),
  draftController.updateNext
);
// existing legacy route follows immediately
```

Check if `schemas.draftCreationPayload` and `schemas.draftUpdatePayload` are re-exported from `@zerologementvacant/schemas`. If not, import directly.

**Step 6: Run the tests**
```bash
yarn nx test server -- draft-api
```
Expected: ✅ all tests pass (new + existing)

**Step 7: Typecheck**
```bash
yarn nx typecheck server
```

**Step 8: Commit**
```bash
git add server/src/controllers/draftController.ts \
        server/src/routers/protected.ts \
        server/src/controllers/test/draft-api.test.ts
git commit -m "feat(server): add createNext and updateNext draft handlers gated by new-campaigns flag"
```

---

## Task 7: Frontend — RTK Query service update

**Files:**
- Modify: the draft service (find with `find frontend/src -name "*draft*service*"`)

**Context:** Add `updateDraftNext` mutation posting `DraftUpdatePayload`. The existing `updateDraft` mutation stays for the legacy path.

**Step 1: Locate the service file**
```bash
find frontend/src -name "*draft*service*"
```

**Step 2: Add the mutation**

```typescript
updateDraftNext: builder.mutation<DraftDTO, DraftUpdatePayload>({
  query: ({ id, ...payload }) => ({
    url: `drafts/${id}`,
    method: 'PUT',
    body: payload
  }),
  invalidatesTags: (_result, _error, { id }) => [{ type: 'Draft', id }]
})
```

Export `useUpdateDraftNextMutation`.

**Step 3: Typecheck**
```bash
yarn nx typecheck frontend
```

**Step 4: Commit**
```bash
git add frontend/src/services/
git commit -m "feat(frontend): add updateDraftNext RTK Query mutation"
```

---

## Task 8: Frontend — Wire `DraftSignatureNext`

**Files:**
- Modify: `frontend/src/components/Draft/DraftSignatureNext.tsx`
- Modify: `frontend/src/components/Draft/DraftForm.tsx`

**Context:** `DraftForm` is already the new path (no flag indirection needed). Wire the `onUpload` callback to set `sender.signatories.*.document` in the form via `setValue`. The schema used by `DraftForm` needs to switch to `draftCreationPayload`.

**Step 1: Update `DraftForm` to use new schema**

`DraftFormSchema` is currently `InferType<typeof schemas.draft>` (legacy). Change to:
```typescript
export type DraftFormSchema = InferType<typeof schemas.draftCreationPayload>;
```

Update `useForm` values to include `signatories` array with `document` field and `logo` tuple.

Initial values for signatories:
```typescript
signatories: [
  {
    firstName: props.draft.sender.signatories?.[0]?.firstName ?? null,
    lastName: props.draft.sender.signatories?.[0]?.lastName ?? null,
    role: props.draft.sender.signatories?.[0]?.role ?? null,
    document: props.draft.sender.signatories?.[0]?.document?.id ?? null
  },
  {
    firstName: props.draft.sender.signatories?.[1]?.firstName ?? null,
    lastName: props.draft.sender.signatories?.[1]?.lastName ?? null,
    role: props.draft.sender.signatories?.[1]?.role ?? null,
    document: props.draft.sender.signatories?.[1]?.document?.id ?? null
  }
]
```

Initial values for `logo`:
```typescript
logo: [
  props.draft.logoNext?.[0]?.id ?? null,
  props.draft.logoNext?.[1]?.id ?? null
]
```

Update `submit` to call `useUpdateDraftNextMutation`.

**Step 2: Wire `DraftSignatureNext`**

Replace the `TODO` with `useFormContext` + `setValue`:

```typescript
import { useFormContext } from 'react-hook-form';
import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import type { DocumentDTO } from '@zerologementvacant/models';

function DraftSignature() {
  const { setValue } = useFormContext<DraftFormSchema>();

  function onUpload(
    index: 0 | 1
  ): (documents: ReadonlyArray<DocumentDTO>) => void {
    return (documents) => {
      const doc = documents[0] ?? null;
      setValue(
        `sender.signatories.${index}.document`,
        doc?.id ?? null,
        { shouldDirty: true }
      );
    };
  }

  // In the render, pass onUpload(0) for first signatory, onUpload(1) for second
  // Remove the Controller wrapper around DraftDocumentUpload —
  // setValue is called from the upload callback directly
  return (
    <Grid ...>
      <Grid container size={{ xs: 12, md: 6 }} spacing="1rem">
        {/* ... existing text fields for signatory 0 ... */}
        <Grid size={12}>
          <DraftDocumentUpload
            label="Signature du premier expéditeur"
            onUpload={onUpload(0)}
          />
        </Grid>
      </Grid>
      <Grid container size={{ xs: 12, md: 6 }} spacing="1rem">
        {/* ... existing text fields for signatory 1 ... */}
        <Grid size={12}>
          <DraftDocumentUpload
            label="Signature du second expéditeur"
            onUpload={onUpload(1)}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}
```

**Note on second signatory:** The current `DraftSignatureNext` only renders one signatory. Add the second one following the same Grid pattern.

**Step 3: Typecheck**
```bash
yarn nx typecheck frontend
```

**Step 4: Commit**
```bash
git add frontend/src/components/Draft/DraftSignatureNext.tsx \
        frontend/src/components/Draft/DraftForm.tsx
git commit -m "feat(frontend): wire signatory document upload in DraftSignatureNext via setValue"
```

---

## Task 9: Frontend — MSW handler update + view-level test

**Files:**
- Modify: `frontend/src/mocks/handlers/` (find draft handler file)
- Modify: the view-level test for the campaign draft view

**Context:** No unit test for `DraftSignatureNext` — test at view level, covering the full flow from upload to form submission.

**Step 1: Locate draft-related MSW handlers**
```bash
find frontend/src/mocks -name "*draft*"
```

**Step 2: Add/update MSW handler for new `PUT /drafts/:id` shape**

```typescript
http.put('/api/drafts/:id', async ({ request, params }) => {
  const body = await request.json() as DraftUpdatePayload;
  const dto: DraftDTO = {
    id: params.id as string,
    subject: body.subject,
    body: body.body,
    logo: null,
    logoNext: [null, null],
    sender: genSenderDTO(),  // simplified
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return HttpResponse.json(dto, { status: 200 });
})
```

**Step 3: Add view-level test covering signatory upload flow**

Find the view-level test for `CampaignViewNext` (check `frontend/src/views/Campaign/test/`). Add a test:

```typescript
it('should upload a signature document and submit the draft form', async () => {
  const user = userEvent.setup();

  // Arrange: render CampaignViewNext with a campaign + draft
  // (use existing render setup from the view test file)

  // Act: interact with the file upload for signatory 0
  const fileInput = screen.getByLabelText(/signature du premier expéditeur/i);
  await user.upload(fileInput, new File(['sig'], 'signature.png', { type: 'image/png' }));

  // Assert: MSW intercepts POST /documents, returns DocumentDTO
  // Assert: form field sender.signatories.0.document is set (indirectly via submit)

  // Act: submit the form
  await user.click(screen.getByRole('button', { name: /enregistrer/i }));

  // Assert: MSW intercepts PUT /drafts/:id with sender.signatories[0].document set
  // (capture request in MSW handler and assert)
});
```

**Step 4: Run view-level tests**
```bash
yarn nx test frontend -- CampaignViewNext
```
Expected: ✅ passes

**Step 5: Commit**
```bash
git add frontend/src/mocks/handlers/ \
        frontend/src/views/Campaign/test/
git commit -m "test(frontend): add view-level test for signatory document upload in campaign draft form"
```

---

## Task 10: Final check

**Step 1: Full typecheck**
```bash
yarn nx run-many -t typecheck --exclude=zero-logement-vacant
```

**Step 2: Full test run**
```bash
yarn nx run-many -t test --exclude=zero-logement-vacant
```

Expected: ✅ all pass

---

## Expand-and-Contract Checklist

| Phase | Task | Description |
|-------|------|-------------|
| Expand DB | 2 | Add FK columns alongside old S3-key columns |
| Expand read | 3, 4 | Join documents into query; populate both `file` and `document` |
| Expand write | 6 | New handlers write new columns; old handlers unchanged |
| Feature flag | 6, 8 | Both backend routes and frontend form gated on `new-campaigns` |
| Contract (future PR) | — | Drop `signatory_*_file`, `logo`, deprecated DTO types |

**Do NOT drop old columns or deprecated types in this PR.**
