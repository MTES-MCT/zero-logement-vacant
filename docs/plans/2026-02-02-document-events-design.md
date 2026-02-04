# Document Event Tracking System Design

**Date:** 2026-02-02
**Status:** ✅ Implemented and verified

## Overview

Add comprehensive event tracking for document lifecycle operations and housing-document associations. This enables auditing and timeline visualization for document operations across the application.

## Event Types

We're adding **6 new event types** to track document operations:

### Standalone Document Events

Events not tied to any specific housing:

1. **`document:created`** - When document uploaded via `POST /api/documents`
2. **`document:updated`** - When document metadata changed via `PUT /api/documents/:id`
3. **`document:removed`** - When document soft-deleted via `DELETE /api/documents/:id`

### Housing-Document Association Events

Events tracking document relationships with housings:

4. **`housing:document-attached`** - When document explicitly linked to housing via `POST /api/housing/:id/documents` or `PUT /api/housing` (batch)
5. **`housing:document-detached`** - When document explicitly unlinked from housing via `DELETE /api/housing/:id/documents/:documentId`
6. **`housing:document-removed`** - When document is deleted and all housing associations are removed as a side effect

### Semantic Distinction

Following the pattern established by `housing:group-attached` / `housing:group-detached` / `housing:group-removed`:

- **attached/detached** = Explicit user actions on associations (document still exists)
- **removed** = Association removed as side effect of entity deletion

## Event Payloads

All event payloads store **minimal data: filename only**.

### EventPayloads Type Definition

Add to `packages/models/src/EventPayloads.ts`:

```typescript
export type EventPayloads = {
  // ... existing events ...

  // Standalone document events
  'document:created': CreationEventChange<{
    filename: string;
  }>;

  'document:updated': UpdateEventChange<{
    filename: string;
  }>;

  'document:removed': RemoveEventChange<{
    filename: string;
  }>;

  // Housing-document association events
  'housing:document-attached': CreationEventChange<{
    filename: string;
  }>;

  'housing:document-detached': RemoveEventChange<{
    filename: string;
  }>;

  'housing:document-removed': RemoveEventChange<{
    filename: string;
  }>;
};
```

### Event Type Constants

Add to `packages/models/src/EventType.ts`:

```typescript
export const EVENT_TYPE_VALUES = [
  'housing:created',
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
  'housing:document-attached',    // NEW
  'housing:document-detached',    // NEW
  'housing:document-removed',     // NEW
  'document:created',             // NEW
  'document:updated',             // NEW
  'document:removed',             // NEW
  'owner:updated',
  'campaign:updated'
] as const satisfies ReadonlyArray<EventType>;
```

## API Models

Add to `server/src/models/EventApi.ts`:

```typescript
// Standalone document events
export type DocumentEventApi = EventUnion<
  'document:created' | 'document:updated' | 'document:removed'
> & {
  documentId: string;
};

// Housing-document association events
export type HousingDocumentEventApi = EventUnion<
  'housing:document-attached' | 'housing:document-detached' | 'housing:document-removed'
> & {
  housingGeoCode: string;
  housingId: string;
  documentId: string;
};
```

## Database Schema

### Migration 1: `document_events` Table

**File:** `server/src/infra/database/migrations/YYYYMMDDHHMMSS_document-events.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('document_events', (table) => {
    table.uuid('event_id').primary().references('id').inTable('events').onDelete('CASCADE');
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    table.index('document_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('document_events');
}
```

### Migration 2: `housing_document_events` Table

**File:** `server/src/infra/database/migrations/YYYYMMDDHHMMSS_housing-document-events.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('housing_document_events', (table) => {
    table.uuid('event_id').primary().references('id').inTable('events').onDelete('CASCADE');
    table.string('housing_geo_code').notNullable();
    table.uuid('housing_id').notNullable();
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');

    // Composite foreign key for housing
    table.foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onDelete('CASCADE');

    table.index(['housing_geo_code', 'housing_id']);
    table.index('document_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('housing_document_events');
}
```

## Repository Layer

### Event Repository Changes

**File:** `server/src/repositories/eventRepository.ts`

#### Table Constants

```typescript
export const DOCUMENT_EVENTS_TABLE = 'document_events';
export const HOUSING_DOCUMENT_EVENTS_TABLE = 'housing_document_events';
```

#### Query Builder Functions

```typescript
export const DocumentEvents = (transaction = db) =>
  transaction<DocumentEventDBO>(DOCUMENT_EVENTS_TABLE);

export const HousingDocumentEvents = (transaction = db) =>
  transaction<HousingDocumentEventDBO>(HOUSING_DOCUMENT_EVENTS_TABLE);
```

#### Insert Methods

```typescript
async function insertManyDocumentEvents(
  events: ReadonlyArray<DocumentEventApi>
): Promise<void> {
  if (!events.length) {
    logger.debug('No document event to insert. Skipping...');
    return;
  }

  logger.debug('Inserting document events...', { events: events.length });
  await withinTransaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      DOCUMENT_EVENTS_TABLE,
      events.map(formatDocumentEventApi)
    );
  });
}

async function insertManyHousingDocumentEvents(
  events: ReadonlyArray<HousingDocumentEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting housing document events...', {
    events: events.length
  });
  await withinTransaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      HOUSING_DOCUMENT_EVENTS_TABLE,
      events.map(formatHousingDocumentEventApi)
    );
  });
}
```

#### DBO Types and Formatters

```typescript
export interface DocumentEventDBO {
  event_id: string;
  document_id: string;
}

export function formatDocumentEventApi(
  event: DocumentEventApi
): DocumentEventDBO {
  return {
    event_id: event.id,
    document_id: event.documentId
  };
}

export interface HousingDocumentEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
  document_id: string;
}

export function formatHousingDocumentEventApi(
  event: HousingDocumentEventApi
): HousingDocumentEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
    document_id: event.documentId
  };
}
```

#### Update `find()` Method

Add housing document events to the union query:

```typescript
async function find<Type extends EventType>(
  options?: FindEventsOptions<Type>
): Promise<ReadonlyArray<EventUnion<Type>>> {
  // ... existing code ...

  if (housings.length > 0) {
    query.whereIn(`${EVENTS_TABLE}.id`, (subquery) => {
      subquery
        .select(`${HOUSING_EVENTS_TABLE}.event_id`)
        .from(HOUSING_EVENTS_TABLE)
        // ... existing unions for groups, precisions, owners, campaigns ...

        // Add housing events related to documents
        .unionAll((union) => {
          union
            .select(`${HOUSING_DOCUMENT_EVENTS_TABLE}.event_id`)
            .from(HOUSING_DOCUMENT_EVENTS_TABLE)
            .whereIn(
              [
                `${HOUSING_DOCUMENT_EVENTS_TABLE}.housing_geo_code`,
                `${HOUSING_DOCUMENT_EVENTS_TABLE}.housing_id`
              ],
              housings.map((housing) => [housing.geoCode, housing.id])
            );
        });
    });
  }

  // ... rest of method ...
}
```

#### Export New Methods

```typescript
export default {
  insertManyCampaignEvents,
  insertManyCampaignHousingEvents,
  insertManyHousingEvents,
  insertManyHousingOwnerEvents,
  insertManyGroupHousingEvents,
  insertManyOwnerEvents,
  insertManyPrecisionHousingEvents,
  insertManyDocumentEvents,           // NEW
  insertManyHousingDocumentEvents,    // NEW
  find,
  removeCampaignEvents
};
```

### Housing Document Repository Changes

**File:** `server/src/repositories/housingDocumentRepository.ts`

Add `unlinkMany` method:

```typescript
async function unlinkMany(params: {
  documentIds: string[];
}): Promise<void> {
  if (!params.documentIds.length) {
    logger.debug('No documents to unlink. Skipping...');
    return;
  }

  logger.debug('Unlinking documents from housings...', {
    documents: params.documentIds.length
  });

  await withinTransaction(async (transaction) => {
    await HousingDocuments(transaction)
      .whereIn('document_id', params.documentIds)
      .delete();
  });

  logger.debug('Documents unlinked from housings', {
    documents: params.documentIds.length
  });
}
```

Export the new method:

```typescript
export default {
  // ... existing methods ...
  unlinkMany  // NEW
};
```

## Controller Implementation

### Document Controller

**File:** `server/src/controllers/documentController.ts`

#### POST /api/documents (Create)

```typescript
// After successful upload
const events = documents.map<DocumentEventApi>((document) => ({
  id: uuidv4(),
  type: 'document:created',
  name: 'Création d’un document',
  nextOld: null,
  nextNew: { filename: document.filename },
  createdAt: new Date().toJSON(),
  createdBy: auth.userId,
  documentId: document.id
}));

await eventRepository.insertManyDocumentEvents(events);
```

#### PUT /api/documents/:id (Update)

```typescript
// After successful update
const updateEvent: DocumentEventApi = {
  id: uuidv4(),
  type: 'document:updated',
  name: 'Modification d’un document',
  nextOld: { filename: oldDocument.filename },
  nextNew: { filename: updatedDocument.filename },
  createdAt: new Date().toJSON(),
  createdBy: auth.userId,
  documentId: document.id
};

await eventRepository.insertManyDocumentEvents([updateEvent]);
```

#### DELETE /api/documents/:id (Remove)

```typescript
const remove: RequestHandler = async (request, response) => {
  const { auth, params, establishment } = request as AuthenticatedRequest;

  const document = await documentRepository.findOne(params.id, {
    establishment: establishment.id
  });

  if (!document) {
    throw new DocumentMissingError(params.id);
  }

  // Find all housings linked to this document
  const housingDocuments = await housingDocumentRepository.find({
    filters: { documentIds: [params.id] },
    establishment: establishment.id
  });

  // Create housing:document-removed events for each linked housing
  const removeEvents = housingDocuments.map<HousingDocumentEventApi>((housingDocument) => ({
    id: uuidv4(),
    type: 'housing:document-removed',
    name: 'Suppression d’un document du logement',
    nextOld: { filename: document.filename },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: auth.userId,
    documentId: params.id,
    housingGeoCode: housingDocument.housingGeoCode,
    housingId: housingDocument.housingId
  }));

  // Create document:removed event
  const documentRemoveEvent: DocumentEventApi = {
    id: uuidv4(),
    type: 'document:removed',
    name: 'Suppression d’un document',
    nextOld: { filename: document.filename },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: auth.userId,
    documentId: params.id
  };

  await startTransaction(async () => {
    // All operations can run in parallel - they're independent
    await Promise.all([
      eventRepository.insertManyHousingDocumentEvents(removeEvents),
      eventRepository.insertManyDocumentEvents([documentRemoveEvent]),
      housingDocumentRepository.unlinkMany({ documentIds: [params.id] }),
      documentRepository.remove(params.id)
    ]);
  });

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};
```

### Housing Document Link Controller

#### POST /api/housing/:id/documents (Attach)

```typescript
// After successful linking
const attachEvents = documentIds.map<HousingDocumentEventApi>((documentId) => {
  const document = documents.find(document => document.id === documentId);
  return {
    id: uuidv4(),
    type: 'housing:document-attached',
    name: 'Ajout d’un document au logement',
    nextOld: null,
    nextNew: { filename: document.filename },
    createdAt: new Date().toJSON(),
    createdBy: auth.userId,
    documentId: documentId,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  };
});

await eventRepository.insertManyHousingDocumentEvents(attachEvents);
```

#### DELETE /api/housing/:housingId/documents/:documentId (Detach)

```typescript
// After successful unlinking
const detachEvent: HousingDocumentEventApi = {
  id: uuidv4(),
  type: 'housing:document-detached',
  name: 'Retrait d’un document du logement',
  nextOld: { filename: document.filename },
  nextNew: null,
  createdAt: new Date().toJSON(),
  createdBy: auth.userId,
  documentId: documentId,
  housingGeoCode: housing.geoCode,
  housingId: housing.id
};

await eventRepository.insertManyHousingDocumentEvents([detachEvent]);
```

### Housing Batch Update Controller

#### PUT /api/housing (Batch Attach)

```typescript
// In PUT /api/housing handler (when documentIds provided)
// After successful linkMany operation

const batchAttachEvents = updatedHousings.flatMap((housing) =>
  documentIds.map<HousingDocumentEventApi>((documentId) => {
    const document = documents.find(document => document.id === documentId);
    return {
      id: uuidv4(),
      type: 'housing:document-attached',
      name: 'Ajout d’un document au logement',
      nextOld: null,
      nextNew: { filename: document.filename },
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      documentId: documentId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    };
  })
);

await eventRepository.insertManyHousingDocumentEvents(batchAttachEvents);
```

**Example:** 2 documents × 50 housings = 100 `housing:document-attached` events created in a single batch insert.

## Testing Strategy

### Repository Tests

**File:** `server/src/repositories/test/eventRepository.test.ts`

```typescript
import { constants } from 'node:http2';
import { v4 as uuidv4 } from 'uuid';

import {
  Events,
  DocumentEvents,
  HousingDocumentEvents
} from '~/repositories/eventRepository';
import eventRepository from '~/repositories/eventRepository';

describe('Document Events', () => {
  describe('insertManyDocumentEvents', () => {
    it('should insert document:created events', async () => {
      const document = genDocumentApi();
      const user = genUserApi();
      const events: DocumentEventApi[] = [{
        id: uuidv4(),
        type: 'document:created',
        name: 'Création d’un document',
        nextOld: null,
        nextNew: { filename: document.filename },
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        documentId: document.id
      }];

      await eventRepository.insertManyDocumentEvents(events);

      const [eventRecord] = await Events().where({ id: events[0].id });
      expect(eventRecord).toMatchObject({
        type: 'document:created',
        next_new: { filename: document.filename },
        next_old: null
      });

      const [documentEvent] = await DocumentEvents()
        .where({ event_id: events[0].id });
      expect(documentEvent).toMatchObject({
        document_id: document.id
      });
    });

    it('should insert document:updated events', async () => {
      const document = genDocumentApi();
      const user = genUserApi();
      const events: DocumentEventApi[] = [{
        id: uuidv4(),
        type: 'document:updated',
        name: 'Modification d’un document',
        nextOld: { filename: 'old.pdf' },
        nextNew: { filename: 'new.pdf' },
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        documentId: document.id
      }];

      await eventRepository.insertManyDocumentEvents(events);

      const [eventRecord] = await Events().where({ id: events[0].id });
      expect(eventRecord).toMatchObject({
        type: 'document:updated',
        next_old: { filename: 'old.pdf' },
        next_new: { filename: 'new.pdf' }
      });
    });

    it('should insert document:removed events', async () => {
      const document = genDocumentApi();
      const user = genUserApi();
      const events: DocumentEventApi[] = [{
        id: uuidv4(),
        type: 'document:removed',
        name: 'Suppression d’un document',
        nextOld: { filename: document.filename },
        nextNew: null,
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        documentId: document.id
      }];

      await eventRepository.insertManyDocumentEvents(events);

      const [eventRecord] = await Events().where({ id: events[0].id });
      expect(eventRecord).toMatchObject({
        type: 'document:removed',
        next_old: { filename: document.filename }
      });
      expect(eventRecord.next_new).toBeNull();
    });
  });

  describe('insertManyHousingDocumentEvents', () => {
    it('should insert housing:document-attached events', async () => {
      const housing = genHousingApi();
      const document = genDocumentApi();
      const user = genUserApi();
      const events: HousingDocumentEventApi[] = [{
        id: uuidv4(),
        type: 'housing:document-attached',
        name: 'Ajout d’un document au logement',
        nextOld: null,
        nextNew: { filename: document.filename },
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        documentId: document.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }];

      await eventRepository.insertManyHousingDocumentEvents(events);

      const [eventRecord] = await Events().where({ id: events[0].id });
      expect(eventRecord).toMatchObject({
        type: 'housing:document-attached',
        next_new: { filename: document.filename }
      });

      const [housingDocumentEvent] = await HousingDocumentEvents()
        .where({ event_id: events[0].id });
      expect(housingDocumentEvent).toMatchObject({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        document_id: document.id
      });
    });

    it('should insert housing:document-detached events', async () => {
      const housing = genHousingApi();
      const document = genDocumentApi();
      const user = genUserApi();
      const events: HousingDocumentEventApi[] = [{
        id: uuidv4(),
        type: 'housing:document-detached',
        name: 'Retrait d’un document du logement',
        nextOld: { filename: document.filename },
        nextNew: null,
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        documentId: document.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }];

      await eventRepository.insertManyHousingDocumentEvents(events);

      const [eventRecord] = await Events().where({ id: events[0].id });
      expect(eventRecord).toMatchObject({
        type: 'housing:document-detached',
        next_old: { filename: document.filename }
      });
      expect(eventRecord.next_new).toBeNull();
    });

    it('should insert housing:document-removed events', async () => {
      const housing = genHousingApi();
      const document = genDocumentApi();
      const user = genUserApi();
      const events: HousingDocumentEventApi[] = [{
        id: uuidv4(),
        type: 'housing:document-removed',
        name: 'Suppression d’un document du logement',
        nextOld: { filename: document.filename },
        nextNew: null,
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        documentId: document.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }];

      await eventRepository.insertManyHousingDocumentEvents(events);

      const [eventRecord] = await Events().where({ id: events[0].id });
      expect(eventRecord).toMatchObject({
        type: 'housing:document-removed',
        next_old: { filename: document.filename }
      });
      expect(eventRecord.next_new).toBeNull();
    });
  });
});
```

**File:** `server/src/repositories/test/housingDocumentRepository.test.ts`

```typescript
describe('unlinkMany', () => {
  it('should unlink multiple documents from all housings', async () => {
    const housings = [genHousingApi(), genHousingApi()];
    const documents = [genDocumentApi(), genDocumentApi()];

    await housingRepository.saveMany(housings);
    await documentRepository.insertMany(documents);

    // Link all documents to all housings
    await housingDocumentRepository.linkMany({
      documentIds: documents.map(document => document.id),
      housingIds: housings.map(housing => housing.id),
      housingGeoCodes: housings.map(housing => housing.geoCode)
    });

    await housingDocumentRepository.unlinkMany({
      documentIds: documents.map(document => document.id)
    });

    const links = await HousingDocuments()
      .whereIn('document_id', documents.map(document => document.id));
    expect(links).toBeEmpty();
  });

  it('should handle empty array', async () => {
    await housingDocumentRepository.unlinkMany({ documentIds: [] });
    // Should not throw
  });
});
```

### API Tests

**File:** `server/src/controllers/test/document-api.test.ts`

All document-related event tests go in this single file:

```typescript
import { constants } from 'node:http2';
import path from 'node:path';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { Events, DocumentEvents, HousingDocumentEvents } from '~/repositories/eventRepository';

const samplePdfPath = path.join(__dirname, '../../test/sample.pdf');

describe('POST /api/documents', () => {
  it('should create document:created event when uploading document', async () => {
    const { status, body } = await request(url)
      .post('/api/documents')
      .use(tokenProvider(user))
      .attach('files', samplePdfPath);

    expect(status).toBe(constants.HTTP_STATUS_CREATED);
    const document = body[0];

    const [eventRecord] = await Events()
      .where({ type: 'document:created' })
      .orderBy('created_at', 'desc')
      .limit(1);

    expect(eventRecord).toMatchObject({
      type: 'document:created',
      next_new: { filename: document.filename }
    });
    expect(eventRecord.next_old).toBeNull();

    const [documentEvent] = await DocumentEvents()
      .where({ event_id: eventRecord.id });
    expect(documentEvent).toMatchObject({
      document_id: document.id
    });
  });
});

describe('PUT /api/documents/:id', () => {
  it('should create document:updated event when renaming document', async () => {
    const document = genDocumentApi({ filename: 'old.pdf' });
    await documentRepository.insert(document);

    const { status } = await request(url)
      .put(`/api/documents/${document.id}`)
      .use(tokenProvider(user))
      .send({ filename: 'new.pdf' });

    expect(status).toBe(constants.HTTP_STATUS_OK);

    const [eventRecord] = await Events()
      .where({ type: 'document:updated' })
      .orderBy('created_at', 'desc')
      .limit(1);

    expect(eventRecord).toMatchObject({
      type: 'document:updated',
      next_old: { filename: 'old.pdf' },
      next_new: { filename: 'new.pdf' }
    });
  });
});

describe('DELETE /api/documents/:id', () => {
  it('should create document:removed and housing:document-removed events', async () => {
    const housing = genHousingApi();
    const document = genDocumentApi();
    await housingRepository.save(housing);
    await documentRepository.insert(document);
    await housingDocumentRepository.link({
      ...document,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    });

    const { status } = await request(url)
      .delete(`/api/documents/${document.id}`)
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

    // Check document:removed event
    const [documentRemoveEvent] = await Events()
      .where({ type: 'document:removed' })
      .orderBy('created_at', 'desc')
      .limit(1);

    expect(documentRemoveEvent).toMatchObject({
      type: 'document:removed',
      next_old: { filename: document.filename }
    });
    expect(documentRemoveEvent.next_new).toBeNull();

    // Check housing:document-removed event
    const [housingRemoveEvent] = await Events()
      .where({ type: 'housing:document-removed' })
      .orderBy('created_at', 'desc')
      .limit(1);

    expect(housingRemoveEvent).toMatchObject({
      type: 'housing:document-removed',
      next_old: { filename: document.filename }
    });
    expect(housingRemoveEvent.next_new).toBeNull();

    const [housingDocumentEvent] = await HousingDocumentEvents()
      .where({ event_id: housingRemoveEvent.id });
    expect(housingDocumentEvent).toMatchObject({
      housing_id: housing.id,
      document_id: document.id
    });
  });
});

describe('POST /api/housing/:id/documents', () => {
  it('should create housing:document-attached events when linking documents', async () => {
    const housing = genHousingApi();
    const documents = [genDocumentApi(), genDocumentApi()];
    await housingRepository.save(housing);
    await documentRepository.insertMany(documents);

    const { status } = await request(url)
      .post(`/api/housing/${housing.id}/documents`)
      .use(tokenProvider(user))
      .send({ documentIds: documents.map(document => document.id) });

    expect(status).toBe(constants.HTTP_STATUS_CREATED);

    const eventRecords = await Events()
      .where({ type: 'housing:document-attached' })
      .orderBy('created_at', 'desc');

    expect(eventRecords).toHaveLength(2);

    const housingDocumentEvents = await HousingDocumentEvents()
      .whereIn('event_id', eventRecords.map(event => event.id));

    expect(housingDocumentEvents).toHaveLength(2);
    expect(housingDocumentEvents).toSatisfyAll((housingDocumentEvent) =>
      housingDocumentEvent.housing_id === housing.id
    );
    expect(housingDocumentEvents.map(event => event.document_id))
      .toIncludeSameMembers(documents.map(document => document.id));
  });
});

describe('DELETE /api/housing/:housingId/documents/:documentId', () => {
  it('should create housing:document-detached event when unlinking document', async () => {
    const housing = genHousingApi();
    const document = genDocumentApi();
    await housingRepository.save(housing);
    await documentRepository.insert(document);
    await housingDocumentRepository.link({
      ...document,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    });

    const { status } = await request(url)
      .delete(`/api/housing/${housing.id}/documents/${document.id}`)
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

    const [eventRecord] = await Events()
      .where({ type: 'housing:document-detached' })
      .orderBy('created_at', 'desc')
      .limit(1);

    expect(eventRecord).toMatchObject({
      type: 'housing:document-detached',
      next_old: { filename: document.filename }
    });
    expect(eventRecord.next_new).toBeNull();

    const [housingDocumentEvent] = await HousingDocumentEvents()
      .where({ event_id: eventRecord.id });
    expect(housingDocumentEvent).toMatchObject({
      housing_id: housing.id,
      document_id: document.id
    });
  });
});

describe('PUT /api/housing (batch)', () => {
  it('should create housing:document-attached events for batch operations', async () => {
    const housings = [genHousingApi(), genHousingApi()];
    const documents = [genDocumentApi(), genDocumentApi()];
    await housingRepository.saveMany(housings);
    await documentRepository.insertMany(documents);

    const { status } = await request(url)
      .put('/api/housing')
      .use(tokenProvider(user))
      .send({
        filters: {
          establishmentIds: [establishment.id],
          housingIds: housings.map(housing => housing.id)
        },
        documentIds: documents.map(document => document.id)
      });

    expect(status).toBe(constants.HTTP_STATUS_OK);

    // Should create 2 housings × 2 documents = 4 events
    const eventRecords = await Events()
      .where({ type: 'housing:document-attached' })
      .orderBy('created_at', 'desc');

    expect(eventRecords).toHaveLength(4);

    const housingDocumentEvents = await HousingDocumentEvents()
      .whereIn('event_id', eventRecords.map(event => event.id));

    expect(housingDocumentEvents).toHaveLength(4);
  });
});
```

## Implementation Summary

### Files to Create/Modify

**1. Shared Models** (`packages/models/src/`):
- ✏️ `EventPayloads.ts` - Add 6 new event payload types
- ✏️ `EventType.ts` - Add 6 new event type constants

**2. Server Models** (`server/src/models/`):
- ✏️ `EventApi.ts` - Add `DocumentEventApi` and `HousingDocumentEventApi` types

**3. Repository** (`server/src/repositories/`):
- ✏️ `eventRepository.ts` - Add tables, query builders, insert methods, DBOs, update `find()`
- ✏️ `housingDocumentRepository.ts` - Add `unlinkMany()` method
- ✏️ `test/eventRepository.test.ts` - Add repository tests
- ✏️ `test/housingDocumentRepository.test.ts` - Add `unlinkMany()` tests

**4. Controllers** (`server/src/controllers/`):
- ✏️ `documentController.ts` - Add event creation for all operations
- ✏️ Housing document link controller - Add event creation
- ✏️ Housing batch update controller - Add event creation
- ✏️ `test/document-api.test.ts` - Add ALL document-related event tests

**5. Database** (`server/src/infra/database/migrations/`):
- 📄 `YYYYMMDDHHMMSS_document-events.ts` - Create `document_events` table
- 📄 `YYYYMMDDHHMMSS_housing-document-events.ts` - Create `housing_document_events` table

**Legend:** ✏️ = Modify existing file, 📄 = Create new file

## Event Flow Examples

1. **Upload document:** `POST /api/documents` → `document:created` event
2. **Rename document:** `PUT /api/documents/:id` → `document:updated` event
3. **Delete document:** `DELETE /api/documents/:id` → `document:removed` + N×`housing:document-removed` events (one per linked housing)
4. **Link to housing:** `POST /api/housing/:id/documents` → `housing:document-attached` events (one per document)
5. **Unlink from housing:** `DELETE /api/housing/:id/documents/:documentId` → `housing:document-detached` event
6. **Batch link:** `PUT /api/housing` → `housing:document-attached` events (one per document-housing pair)

## Key Design Decisions

1. **Minimal payloads:** Only store filename to keep events lightweight
2. **One event per pair:** Batch operations create individual events for granular timeline tracking
3. **Cascade events:** Document deletion creates both `document:removed` and `housing:document-removed` events
4. **Separate migrations:** Two migration files for cleaner separation of concerns
5. **Consolidated tests:** All document API tests in single `document-api.test.ts` file
6. **Parallel operations:** Use `Promise.all()` in controllers for independent repository calls
7. **French apostrophes:** Use `'` instead of `\'` in all French text
8. **jest-extended matchers:** Use `toMatchObject()`, `toBeNull()`, `toSatisfyAll()`, etc. to reduce boilerplate
9. **HTTP constants:** Use `constants.HTTP_STATUS_*` from `node:http2` instead of numeric literals
10. **Primitive assertions:** Test repositories using table accessor functions (`Events()`, `DocumentEvents()`) not the repository being tested