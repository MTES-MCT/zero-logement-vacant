import { EventPayloads, EventType } from '@zerologementvacant/models';
import { Array } from 'effect';
import type { ExpressionBuilder, Insertable, Selectable } from 'kysely';
import { sql } from 'kysely';
import pMap from 'p-map';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import {
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
import { HousingId } from '~/models/HousingApi';
import { OwnerApi } from '~/models/OwnerApi';
import { fromUserDBO, UserDBO } from '~/repositories/userRepository';

const logger = createLogger('eventRepository');

// Matches Knex's batchInsert default chunk size, which the Kysely inserts below
// must replicate manually to stay under Postgres's 65535 bind-parameter limit.
const INSERT_BATCH_SIZE = 1000;

export const EVENTS_TABLE = 'events';
export const OWNER_EVENTS_TABLE = 'owner_events';
export const HOUSING_EVENTS_TABLE = 'housing_events';
export const HOUSING_OWNER_EVENTS_TABLE = 'housing_owner_events';
export const CAMPAIGN_EVENTS_TABLE = 'campaign_events';
export const CAMPAIGN_HOUSING_EVENTS_TABLE = 'campaign_housing_events';
export const GROUP_HOUSING_EVENTS_TABLE = 'group_housing_events';
export const PRECISION_HOUSING_EVENTS_TABLE = 'precision_housing_events';
export const DOCUMENT_EVENTS_TABLE = 'document_events';
export const HOUSING_DOCUMENT_EVENTS_TABLE = 'housing_document_events';

export const Events = <Type extends EventType>(transaction = db) =>
  transaction<EventRecordDBO<Type>>(EVENTS_TABLE);
export const OwnerEvents = (transaction = db) =>
  transaction<OwnerEventDBO>(OWNER_EVENTS_TABLE);
export const HousingEvents = (transaction = db) =>
  transaction<HousingEventDBO>(HOUSING_EVENTS_TABLE);
export const HousingOwnerEvents = (transaction = db) =>
  transaction<HousingOwnerEventDBO>(HOUSING_OWNER_EVENTS_TABLE);
export const CampaignEvents = (transaction = db) =>
  transaction<CampaignEventDBO>(CAMPAIGN_EVENTS_TABLE);
export const CampaignHousingEvents = (transaction = db) =>
  transaction<CampaignHousingEventDBO>(CAMPAIGN_HOUSING_EVENTS_TABLE);
export const GroupHousingEvents = (transaction = db) =>
  transaction<GroupHousingEventDBO>(GROUP_HOUSING_EVENTS_TABLE);
export const PrecisionHousingEvents = (transaction = db) =>
  transaction<PrecisionHousingEventDBO>(PRECISION_HOUSING_EVENTS_TABLE);

export const DocumentEvents = (transaction = db) =>
  transaction<DocumentEventDBO>(DOCUMENT_EVENTS_TABLE);
export const HousingDocumentEvents = (transaction = db) =>
  transaction<HousingDocumentEventDBO>(HOUSING_DOCUMENT_EVENTS_TABLE);

async function insertManyHousingEvents(
  events: ReadonlyArray<HousingEventApi>
): Promise<void> {
  if (!events.length) {
    logger.debug('No housing event to insert. Skipping...');
    return;
  }

  logger.debug('Inserting housing events...', { events: events.length });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx
          .insertInto('events')
          .values(batch.map(toEventInsert))
          .onConflict((oc) => oc.column('id').doNothing())
          .execute();
        await trx
          .insertInto('housingEvents')
          .values(batch.map(toHousingEventInsert))
          .onConflict((oc) => oc.column('eventId').doNothing())
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

function toEventInsert<Type extends EventType>(
  event: EventApi<Type>
): Insertable<DB['events']> {
  return {
    id: event.id,
    type: event.type,
    nextOld: event.nextOld as Insertable<DB['events']>['nextOld'],
    nextNew: event.nextNew as Insertable<DB['events']>['nextNew'],
    createdAt: new Date(event.createdAt),
    createdBy: event.createdBy
  };
}

function toHousingEventInsert(
  event: HousingEventApi
): Insertable<DB['housingEvents']> {
  return {
    eventId: event.id,
    housingGeoCode: event.housingGeoCode,
    housingId: event.housingId
  };
}

function toOwnerEventInsert(
  event: OwnerEventApi
): Insertable<DB['ownerEvents']> {
  return {
    eventId: event.id,
    ownerId: event.ownerId
  };
}

function toHousingOwnerEventInsert(
  event: HousingOwnerEventApi
): Insertable<DB['housingOwnerEvents']> {
  return {
    eventId: event.id,
    housingGeoCode: event.housingGeoCode,
    housingId: event.housingId,
    ownerId: event.ownerId ?? null
  };
}

async function insertManyHousingOwnerEvents(
  events: ReadonlyArray<HousingOwnerEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting housing owner events...', {
    events: events.length
  });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx
          .insertInto('events')
          .values(batch.map(toEventInsert))
          .onConflict((oc) => oc.column('id').doNothing())
          .execute();
        await trx
          .insertInto('housingOwnerEvents')
          .values(batch.map(toHousingOwnerEventInsert))
          .onConflict((oc) => oc.column('eventId').doNothing())
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

function toPrecisionHousingEventInsert(
  event: PrecisionHousingEventApi
): Insertable<DB['precisionHousingEvents']> {
  return {
    eventId: event.id,
    housingGeoCode: event.housingGeoCode,
    housingId: event.housingId,
    precisionId: event.precisionId ?? null
  };
}

async function insertManyPrecisionHousingEvents(
  events: ReadonlyArray<PrecisionHousingEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting precision housing events...', {
    events: events.length
  });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx.insertInto('events').values(batch.map(toEventDBO)).execute();
        await trx
          .insertInto('precisionHousingEvents')
          .values(batch.map(toPrecisionHousingEventInsert))
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

async function insertManyOwnerEvents(
  events: ReadonlyArray<OwnerEventApi>
): Promise<void> {
  if (!events.length) {
    logger.debug('No owner event to insert. Skipping...');
    return;
  }

  logger.debug('Inserting owner events...', { events: events.length });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx.insertInto('events').values(batch.map(toEventDBO)).execute();
        await trx
          .insertInto('ownerEvents')
          .values(batch.map(toOwnerEventInsert))
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

async function insertManyCampaignHousingEvents(
  events: ReadonlyArray<CampaignHousingEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting campaign housing events...', {
    events: events.length
  });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx.insertInto('events').values(batch.map(toEventDBO)).execute();
        await trx
          .insertInto('campaignHousingEvents')
          .values(batch.map(toCampaignHousingEventInsert))
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

function toCampaignHousingEventInsert(
  event: CampaignHousingEventApi
): Insertable<DB['campaignHousingEvents']> {
  return {
    eventId: event.id,
    campaignId: event.campaignId,
    housingGeoCode: event.housingGeoCode,
    housingId: event.housingId
  };
}

function toCampaignEventInsert(
  event: CampaignEventApi
): Insertable<DB['campaignEvents']> {
  return {
    eventId: event.id,
    campaignId: event.campaignId
  };
}

async function insertManyCampaignEvents(
  events: ReadonlyArray<CampaignEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting campaign events...', {
    events: events.length
  });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx.insertInto('events').values(batch.map(toEventDBO)).execute();
        await trx
          .insertInto('campaignEvents')
          .values(batch.map(toCampaignEventInsert))
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

async function insertManyGroupHousingEvents(
  events: GroupHousingEventApi[]
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting group events...', {
    events: events.length
  });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx.insertInto('events').values(batch.map(toEventDBO)).execute();
        await trx
          .insertInto('groupHousingEvents')
          .values(batch.map(toGroupHousingEventDBO))
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

function toEventDBO<Type extends EventType>(
  event: EventApi<Type>
): Insertable<DB['events']> {
  return {
    id: event.id,
    type: event.type,
    nextOld: event.nextOld as Insertable<DB['events']>['nextOld'],
    nextNew: event.nextNew as Insertable<DB['events']>['nextNew'],
    createdAt: new Date(event.createdAt),
    createdBy: event.createdBy
  };
}

function toGroupHousingEventDBO(
  event: GroupHousingEventApi
): Insertable<DB['groupHousingEvents']> {
  return {
    eventId: event.id,
    housingGeoCode: event.housingGeoCode,
    housingId: event.housingId,
    groupId: event.groupId ?? null
  };
}

function toDocumentEventInsert(
  event: DocumentEventApi
): Insertable<DB['documentEvents']> {
  return {
    eventId: event.id,
    documentId: event.documentId
  };
}

async function insertManyDocumentEvents(
  events: ReadonlyArray<DocumentEventApi>
): Promise<void> {
  if (!events.length) {
    logger.debug('No document event to insert. Skipping...');
    return;
  }

  logger.debug('Inserting document events...', { events: events.length });
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx.insertInto('events').values(batch.map(toEventDBO)).execute();
        await trx
          .insertInto('documentEvents')
          .values(batch.map(toDocumentEventInsert))
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

function toHousingDocumentEventInsert(
  event: HousingDocumentEventApi
): Insertable<DB['housingDocumentEvents']> {
  return {
    eventId: event.id,
    housingGeoCode: event.housingGeoCode,
    housingId: event.housingId,
    documentId: event.documentId
  };
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
  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(events, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx.insertInto('events').values(batch.map(toEventDBO)).execute();
        await trx
          .insertInto('housingDocumentEvents')
          .values(batch.map(toHousingDocumentEventInsert))
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

interface FindEventsOptions<Type extends EventType> {
  filters?: {
    types?: ReadonlyArray<Type>;
    housings?: ReadonlyArray<HousingId>;
    owners?: ReadonlyArray<OwnerApi['id']>;
  };
}

// `housings` is matched against a composite (housingGeoCode, housingId) key
// across 6 join tables — mirrors the tuple-IN pattern already used in
// groupRepository.ts's removeHousing.
function matchesHousingTuple(
  eb: ExpressionBuilder<DB, keyof DB>,
  housings: ReadonlyArray<HousingId>
) {
  return eb(
    eb.refTuple('housingGeoCode', 'housingId'),
    'in',
    housings.map((housing) => eb.tuple(housing.geoCode, housing.id))
  );
}

function housingEventIdsQuery(
  eb: ExpressionBuilder<DB, 'events'>,
  housings: ReadonlyArray<HousingId>
) {
  return eb
    .selectFrom('housingEvents')
    .select('eventId')
    .where((inner) => matchesHousingTuple(inner, housings))
    .unionAll(
      eb
        .selectFrom('groupHousingEvents')
        .select('eventId')
        .where((inner) => matchesHousingTuple(inner, housings))
    )
    .unionAll(
      eb
        .selectFrom('precisionHousingEvents')
        .select('eventId')
        .where((inner) => matchesHousingTuple(inner, housings))
    )
    .unionAll(
      eb
        .selectFrom('housingOwnerEvents')
        .select('eventId')
        .where((inner) => matchesHousingTuple(inner, housings))
    )
    .unionAll(
      eb
        .selectFrom('campaignHousingEvents')
        .select('eventId')
        .where((inner) => matchesHousingTuple(inner, housings))
    )
    .unionAll(
      eb
        .selectFrom('housingDocumentEvents')
        .select('eventId')
        .where((inner) => matchesHousingTuple(inner, housings))
    );
}

async function find<Type extends EventType>(
  options?: FindEventsOptions<Type>
): Promise<ReadonlyArray<EventUnion<Type>>> {
  logger.debug('Finding events...', { options });
  const types = options?.filters?.types ?? [];
  const housings = options?.filters?.housings ?? [];
  const owners = options?.filters?.owners ?? [];

  const rows = await kysely
    .selectFrom('events')
    .innerJoin('users', 'users.id', 'events.createdBy')
    .selectAll('events')
    .select(sql<UserDBO>`to_json(users.*)`.as('creator'))
    .$if(types.length > 0, (query) => query.where('events.type', 'in', types))
    .$if(housings.length > 0, (query) =>
      query.where('events.id', 'in', (eb) => housingEventIdsQuery(eb, housings))
    )
    .$if(owners.length > 0, (query) =>
      query.where('events.id', 'in', (eb) =>
        eb
          .selectFrom('ownerEvents')
          .select('eventId')
          .where('ownerEvents.ownerId', 'in', owners)
      )
    )
    .orderBy('events.createdAt', 'desc')
    .execute();

  logger.debug(`Found ${rows.length} events`, { options });
  return rows.map(parseEventRow) as unknown as ReadonlyArray<EventUnion<Type>>;
}

async function removeCampaignEvents(campaignId: string): Promise<void> {
  logger.debug('Removing campaign events...', {
    campaign: campaignId
  });
  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom('events')
      .where('id', 'in', (qb) =>
        qb
          .selectFrom('campaignEvents')
          .select('eventId')
          .where('campaignId', '=', campaignId)
      )
      .execute();
  });
  logger.debug('Campaign events removed', {
    campaign: campaignId
  });
}

export interface EventRecordDBO<Type extends EventType> {
  id: string;
  type: Type;
  next_old: EventPayloads[Type]['old'] | null;
  next_new: EventPayloads[Type]['new'] | null;
  created_at: Date;
  created_by: string;
}

export interface EventDBO<Type extends EventType> extends EventRecordDBO<Type> {
  creator?: UserDBO;
}

export function formatEventApi<Type extends EventType>(
  event: EventApi<Type>
): EventRecordDBO<Type> {
  return {
    id: event.id,
    type: event.type,
    next_old: event.nextOld,
    next_new: event.nextNew,
    created_at: new Date(event.createdAt),
    created_by: event.createdBy
  };
}

export function parseEventApi<Type extends EventType>(
  event: EventDBO<Type>
): EventApi<Type> {
  return {
    id: event.id,
    type: event.type,
    nextOld: event.next_old,
    nextNew: event.next_new,
    createdAt: event.created_at.toJSON(),
    createdBy: event.created_by,
    creator: event.creator ? fromUserDBO(event.creator) : undefined
  };
}

// ---------------------------------------------------------------------------
// find()'s Kysely read path — camelCase-native mirror of parseEventApi.
// The `creator` blob comes from to_json(users.*), which stays snake_case
// regardless of engine (CamelCasePlugin's maintainNestedObjectKeys leaves
// raw-SQL JSON aggregates untouched), so it's read via fromUserDBO exactly
// as before.
// ---------------------------------------------------------------------------

type EventRow = Selectable<DB['events']> & { creator: UserDBO };

function parseEventRow<Type extends EventType>(row: EventRow): EventApi<Type> {
  return {
    id: row.id,
    type: row.type as Type,
    nextOld: row.nextOld as EventPayloads[Type]['old'],
    nextNew: row.nextNew as EventPayloads[Type]['new'],
    createdAt: (row.createdAt as Date).toJSON(),
    createdBy: row.createdBy,
    creator: row.creator ? fromUserDBO(row.creator) : undefined
  };
}

export interface HousingEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
}

export function formatHousingEventApi(event: HousingEventApi): HousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId
  };
}

interface PrecisionHousingEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
  precision_id: string | null;
}

export function formatPrecisionHousingEventApi(
  event: PrecisionHousingEventApi
): PrecisionHousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
    precision_id: event.precisionId ?? null
  };
}

export interface HousingOwnerEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
  owner_id: string | null;
}

export function formatHousingOwnerEventApi(
  event: HousingOwnerEventApi
): HousingOwnerEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
    owner_id: event.ownerId ?? null
  };
}

interface PerimeterHousingEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
  perimeter_id: string | null;
}

export function formatPerimeterHousingEventApi(
  event: PerimeterHousingEventApi
): PerimeterHousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
    perimeter_id: event.perimeterId ?? null
  };
}

export interface GroupHousingEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
  group_id: string | null;
}

export function formatGroupHousingEventApi(
  event: GroupHousingEventApi
): GroupHousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
    group_id: event.groupId ?? null
  };
}

export interface CampaignHousingEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
  campaign_id: string | null;
}

export function formatCampaignHousingEventApi(
  event: CampaignHousingEventApi
): CampaignHousingEventDBO {
  return {
    event_id: event.id,
    campaign_id: event.campaignId,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId
  };
}

export interface OwnerEventDBO {
  event_id: string;
  owner_id: string;
}

export function formatOwnerEventApi(event: OwnerEventApi): OwnerEventDBO {
  return {
    event_id: event.id,
    owner_id: event.ownerId
  };
}

interface CampaignEventDBO {
  event_id: string;
  campaign_id: string;
}

export function formatCampaignEventApi(
  event: CampaignEventApi
): CampaignEventDBO {
  return {
    event_id: event.id,
    campaign_id: event.campaignId
  };
}

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

export default {
  insertManyCampaignEvents,
  insertManyCampaignHousingEvents,
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
