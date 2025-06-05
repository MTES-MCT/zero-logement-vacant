import {
  EventName,
  EventPayloads,
  EventType
} from '@zerologementvacant/models';
import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import {
  CampaignEventApi,
  CampaignHousingEventApi,
  EventApi,
  EventUnion,
  GroupHousingEventApi,
  HousingEventApi,
  HousingOwnerEventApi,
  OwnerEventApi,
  PerimeterHousingEventApi,
  PrecisionHousingEventApi
} from '~/models/EventApi';
import { HousingId } from '~/models/HousingApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  parseUserApi,
  UserDBO,
  usersTable
} from '~/repositories/userRepository';

const logger = createLogger('eventRepository');

export const EVENTS_TABLE = 'events';
export const OWNER_EVENTS_TABLE = 'owner_events';
export const HOUSING_EVENTS_TABLE = 'housing_events';
export const HOUSING_OWNER_EVENTS_TABLE = 'housing_owner_events';
export const CAMPAIGN_EVENTS_TABLE = 'campaign_events';
export const CAMPAIGN_HOUSING_EVENTS_TABLE = 'campaign_housing_events';
export const GROUP_HOUSING_EVENTS_TABLE = 'group_housing_events';
export const PRECISION_HOUSING_EVENTS_TABLE = 'precision_housing_events';

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
export const GroupHousingEvents = (transaction = db) =>
  transaction<GroupHousingEventDBO>(GROUP_HOUSING_EVENTS_TABLE);
export const PrecisionHousingEvents = (transaction = db) =>
  transaction<PrecisionHousingEventDBO>(PRECISION_HOUSING_EVENTS_TABLE);

async function insertHousingEvent(
  housingEvent: HousingEventApi
): Promise<void> {
  await insertManyHousingEvents([housingEvent]);
}

async function insertManyHousingEvents(
  events: ReadonlyArray<HousingEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting housing events...', { events: events.length });
  await db.transaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      HOUSING_EVENTS_TABLE,
      events.map(formatHousingEventApi)
    );
  });
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
  await withinTransaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      HOUSING_OWNER_EVENTS_TABLE,
      events.map(formatHousingOwnerEventApi)
    );
  });
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
  await db.transaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      PRECISION_HOUSING_EVENTS_TABLE,
      events.map(formatPrecisionHousingEventApi)
    );
  });
}

async function insertManyOwnerEvents(
  events: ReadonlyArray<OwnerEventApi>
): Promise<void> {
  if (!events.length) {
    return;
  }

  logger.debug('Inserting owner events...', { events: events.length });
  await db.transaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      OWNER_EVENTS_TABLE,
      events.map(formatOwnerEventApi)
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
  await db.transaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      CAMPAIGN_HOUSING_EVENTS_TABLE,
      events.map(formatCampaignHousingEventApi)
    );
  });
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
  await db.transaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      CAMPAIGN_EVENTS_TABLE,
      events.map(formatCampaignEventApi)
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
  await withinTransaction(async (transaction) => {
    await transaction.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
    await transaction.batchInsert(
      GROUP_HOUSING_EVENTS_TABLE,
      events.map(formatGroupHousingEventApi)
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

async function find<Type extends EventType>(
  options?: FindEventsOptions<Type>
): Promise<ReadonlyArray<EventUnion<Type>>> {
  logger.debug('Finding events...', { options });
  const events = await Events()
    .select(`${EVENTS_TABLE}.*`)
    .join(usersTable, `${usersTable}.id`, `${EVENTS_TABLE}.created_by`)
    .select(db.raw(`to_json(${usersTable}.*) AS creator`))
    .modify((query) => {
      const types = options?.filters?.types ?? [];
      const housings = options?.filters?.housings ?? [];
      const owners = options?.filters?.owners ?? [];

      if (types.length) {
        query.whereIn(`${EVENTS_TABLE}.type`, types);
      }

      if (housings.length > 0) {
        query.whereIn(`${EVENTS_TABLE}.id`, (subquery) => {
          subquery
            .select(`${HOUSING_EVENTS_TABLE}.event_id`)
            .from(HOUSING_EVENTS_TABLE)
            .whereIn(
              [
                `${HOUSING_EVENTS_TABLE}.housing_geo_code`,
                `${HOUSING_EVENTS_TABLE}.housing_id`
              ],
              housings.map((housing) => [housing.geoCode, housing.id])
            )
            // Add housing events related to groups
            .unionAll((union) => {
              union
                .select(`${GROUP_HOUSING_EVENTS_TABLE}.event_id`)
                .from(GROUP_HOUSING_EVENTS_TABLE)
                .whereIn(
                  [
                    `${GROUP_HOUSING_EVENTS_TABLE}.housing_geo_code`,
                    `${GROUP_HOUSING_EVENTS_TABLE}.housing_id`
                  ],
                  housings.map((housing) => [housing.geoCode, housing.id])
                );
            })
            // Add housing events related to precisions
            .unionAll((union) => {
              union
                .select(`${PRECISION_HOUSING_EVENTS_TABLE}.event_id`)
                .from(PRECISION_HOUSING_EVENTS_TABLE)
                .whereIn(
                  [
                    `${PRECISION_HOUSING_EVENTS_TABLE}.housing_geo_code`,
                    `${PRECISION_HOUSING_EVENTS_TABLE}.housing_id`
                  ],
                  housings.map((housing) => [housing.geoCode, housing.id])
                );
            });
        });
      }

      if (owners.length) {
        query.whereIn(`${EVENTS_TABLE}.id`, (subquery) => {
          subquery
            .select(`${OWNER_EVENTS_TABLE}.event_id`)
            .from(OWNER_EVENTS_TABLE)
            .whereIn(`${OWNER_EVENTS_TABLE}.owner_id`, owners);
        });
      }
    })
    .orderBy(`${EVENTS_TABLE}.created_at`, 'desc');

  logger.debug(`Found ${events.length} events`, { options });
  return events.map(parseEventApi);
}

const removeCampaignEvents = async (campaignId: string): Promise<void> => {
  logger.info('Delete eventApi for campaign', campaignId);
  await db(CAMPAIGN_EVENTS_TABLE).where('campaign_id', campaignId).delete();
};

export interface EventRecordDBO<Type extends EventType> {
  id: string;
  name: EventName;
  type: Type;
  /**
   * @deprecated
   */
  contact_kind?: string;
  /**
   * @deprecated
   */
  conflict?: boolean;
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
    name: event.name,
    type: event.type,
    conflict: event.conflict,
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
    name: event.name,
    type: event.type,
    conflict: event.conflict,
    nextOld: event.next_old,
    nextNew: event.next_new,
    createdAt: event.created_at.toJSON(),
    createdBy: event.created_by,
    creator: event.creator ? parseUserApi(event.creator) : undefined
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

interface CampaignHousingEventDBO {
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

export default {
  insertManyCampaignEvents,
  insertManyCampaignHousingEvents,
  insertManyHousingEvents,
  insertManyHousingOwnerEvents,
  insertManyGroupHousingEvents,
  insertManyOwnerEvents,
  insertManyPrecisionHousingEvents,
  find,
  removeCampaignEvents
};
