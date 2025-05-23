import {
  EventCategory,
  EventKind,
  EventSection
} from '@zerologementvacant/models';
import async from 'async';
import fp from 'lodash/fp';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { CampaignApi } from '~/models/CampaignApi';
import {
  CampaignEventApi,
  EventApi,
  GroupHousingEventApi,
  HousingEventApi,
  OwnerEventApi
} from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { getHousingStatusApiLabel } from '~/models/HousingStatusApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  parseUserApi,
  UserDBO,
  usersTable
} from '~/repositories/userRepository';

const logger = createLogger('eventRepository');

export const eventsTable = 'events';
export const ownerEventsTable = 'owner_events';
export const housingEventsTable = 'housing_events';
export const campaignEventsTable = 'campaign_events';
export const groupHousingEventsTable = 'group_housing_events';

export const Events = (transaction = db) =>
  transaction<EventRecordDBO<any>>(eventsTable);
export const OwnerEvents = (transaction = db) =>
  transaction<OwnerEventDBO>(ownerEventsTable);
export const HousingEvents = (transaction = db) =>
  transaction<HousingEventDBO>(housingEventsTable);
export const CampaignEvents = (transaction = db) =>
  transaction<CampaignEventDBO>(campaignEventsTable);

export const GroupHousingEvents = (transaction = db) =>
  transaction<GroupHousingEventDBO>(groupHousingEventsTable);

const insertHousingEvent = async (
  housingEvent: HousingEventApi
): Promise<void> => {
  await insertManyHousingEvents([housingEvent]);
};

const insertManyHousingEvents = async (
  housingEvents: ReadonlyArray<HousingEventApi>
): Promise<void> => {
  if (housingEvents.length) {
    await db.transaction(async (transaction) => {
      await async.forEach(
        fp.chunk(config.app.batchSize, housingEvents),
        async (chunk) => {
          await Events(transaction).insert(
            chunk.map((housingEvent) => ({
              ...formatEventApi(housingEvent),
              new: Array.isArray(housingEvent.new)
                ? JSON.stringify(housingEvent.new)
                : denormalizeStatus(housingEvent.new),
              old: Array.isArray(housingEvent.old)
                ? JSON.stringify(housingEvent.old)
                : denormalizeStatus(housingEvent.old)
            }))
          );
          await HousingEvents(transaction).insert(
            chunk.map((housingEvent) => ({
              event_id: housingEvent.id,
              housing_id: housingEvent.housingId,
              housing_geo_code: housingEvent.housingGeoCode
            }))
          );
        }
      );
    });
  }
};

function denormalizeStatus(housing: HousingApi | undefined) {
  if (!housing) {
    return undefined;
  }
  return {
    ...housing,
    status: getHousingStatusApiLabel(housing.status)
  };
}

const insertOwnerEvent = async (ownerEvent: OwnerEventApi): Promise<void> => {
  await db.transaction(async (transaction) => {
    await Events(transaction).insert(formatEventApi(ownerEvent));
    await OwnerEvents(transaction).insert({
      event_id: ownerEvent.id,
      owner_id: ownerEvent.ownerId
    });
  });
};

const insertCampaignEvent = async (
  campaignEvent: CampaignEventApi
): Promise<void> => {
  logger.debug('Creating campaign event...', campaignEvent);
  await db.transaction(async (transaction) => {
    await Events(transaction).insert(formatEventApi(campaignEvent));
    await CampaignEvents(transaction).insert({
      event_id: campaignEvent.id,
      campaign_id: campaignEvent.campaignId
    });
  });
};

const insertManyGroupHousingEvents = async (
  groupHousingEvents: GroupHousingEventApi[]
): Promise<void> => {
  if (!groupHousingEvents.length) {
    return;
  }

  logger.debug('Inserting group events...', {
    events: groupHousingEvents.length
  });
  await db.transaction(async (transaction) => {
    await async.forEach(
      fp.chunk(config.app.batchSize, groupHousingEvents),
      async (chunk) => {
        await Events(transaction).insert(chunk.map(formatEventApi));
        await GroupHousingEvents(transaction).insert(
          chunk.map((event) => ({
            event_id: event.id,
            housing_geo_code: event.housingGeoCode,
            housing_id: event.housingId,
            group_id: event.groupId
          }))
        );
      }
    );
  });
};

async function findEvents<T>(
  tableName: string,
  columnName: string,
  value: string
): Promise<EventApi<T>[]> {
  const events = await Events()
    .select(`${eventsTable}.*`)
    .join(tableName, `${tableName}.event_id`, `${eventsTable}.id`)
    .join(usersTable, `${usersTable}.id`, `${eventsTable}.created_by`)
    .select(db.raw(`to_json(${usersTable}.*) AS creator`))
    .where(`${tableName}.${columnName}`, value)
    .orderBy(`${eventsTable}.created_at`, 'desc');
  logger.debug(`Found ${events.length}`, {
    table: tableName,
    column: columnName,
    id: value
  });
  return events.map(parseEventApi<T>);
}

const findOwnerEvents = async (
  ownerId: string
): Promise<EventApi<OwnerApi>[]> => {
  logger.debug('Find owner events...', {
    owner: ownerId
  });
  return findEvents(ownerEventsTable, 'owner_id', ownerId);
};

const findHousingEvents = async (
  housingId: string
): Promise<EventApi<HousingApi>[]> => {
  logger.debug('Finding housing events...', { housing: housingId });
  return findEvents(housingEventsTable, 'housing_id', housingId);
};

const findCampaignEvents = async (
  campaignId: string
): Promise<EventApi<CampaignApi>[]> => {
  logger.debug('Finding campaign events...', {
    campaign: campaignId
  });
  return findEvents(campaignEventsTable, 'campaign_id', campaignId);
};

const findGroupHousingEvents = async (
  housing: HousingApi,
  group?: GroupApi
): Promise<EventApi<GroupApi>[]> => {
  logger.debug('Find group housing events...', {
    housing: housing.id,
    geoCode: housing.geoCode,
    group: group?.id
  });
  const events = await Events()
    .select(`${eventsTable}.*`)
    .join(
      groupHousingEventsTable,
      `${groupHousingEventsTable}.event_id`,
      `${eventsTable}.id`
    )
    .join(usersTable, `${usersTable}.id`, `${eventsTable}.created_by`)
    .select(db.raw(`to_json(${usersTable}.*) AS creator`))
    .modify((query) => {
      if (group?.id) {
        query.where(`${groupHousingEventsTable}.group_id`, group.id);
      }
    })
    .where(`${groupHousingEventsTable}.housing_id`, housing.id)
    .where(`${groupHousingEventsTable}.housing_geo_code`, housing.geoCode)
    .orderBy(`${eventsTable}.created_at`, 'desc');
  return events.map(parseEventApi<GroupApi>);
};

const removeCampaignEvents = async (campaignId: string): Promise<void> => {
  logger.info('Delete eventApi for campaign', campaignId);
  await db(campaignEventsTable).where('campaign_id', campaignId).delete();
};

export interface EventRecordDBO<T> {
  id: string;
  name: string;
  kind: EventKind;
  category: EventCategory;
  section: EventSection;
  contact_kind?: string;
  conflict?: boolean;
  old?: T;
  new?: T;
  created_at: Date;
  created_by: string;
}

export interface EventDBO<T> extends EventRecordDBO<T> {
  creator?: UserDBO;
}

export interface OwnerEventDBO {
  event_id: string;
  owner_id: string;
}

export interface HousingEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
}

export interface GroupHousingEventDBO {
  event_id: string;
  housing_geo_code: string;
  housing_id: string;
  group_id: string | null;
}

export interface CampaignEventDBO {
  event_id: string;
  campaign_id: string;
}

export function formatEventApi<T>(eventApi: EventApi<T>): EventRecordDBO<T> {
  return {
    id: eventApi.id,
    name: eventApi.name,
    kind: eventApi.kind,
    category: eventApi.category,
    section: eventApi.section,
    conflict: eventApi.conflict,
    old: eventApi.old,
    new: eventApi.new,
    created_at: eventApi.createdAt,
    created_by: eventApi.createdBy
  };
}

export function formatOwnerEventApi(event: OwnerEventApi): OwnerEventDBO {
  return {
    event_id: event.id,
    owner_id: event.ownerId
  };
}

export function formatHousingEventApi(event: HousingEventApi): HousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId
  };
}

export function formatGroupHousingEventApi(
  event: GroupHousingEventApi
): GroupHousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
    group_id: event.groupId
  };
}

export function parseEventApi<T>(eventDbo: EventDBO<T>): EventApi<T> {
  return {
    id: eventDbo.id,
    name: eventDbo.name,
    kind: eventDbo.kind,
    category: eventDbo.category,
    section: eventDbo.section,
    conflict: eventDbo.conflict,
    old: eventDbo.old,
    new: eventDbo.new,
    createdAt: eventDbo.created_at,
    createdBy: eventDbo.created_by,
    creator: eventDbo.creator ? parseUserApi(eventDbo.creator) : undefined
  };
}

export default {
  insertHousingEvent,
  insertManyHousingEvents,
  insertOwnerEvent,
  insertCampaignEvent,
  insertManyGroupHousingEvents,
  findOwnerEvents,
  findHousingEvents,
  findCampaignEvents,
  findGroupHousingEvents,
  removeCampaignEvents,
  formatEventApi
};
