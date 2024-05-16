import async from 'async';
import fp from 'lodash/fp';

import {
  EventCategory,
  EventKind,
  EventSection,
} from '@zerologementvacant/shared';
import config from '~/infra/config';
import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { CampaignApi } from '~/models/CampaignApi';
import {
  CampaignEventApi,
  EventApi,
  GroupHousingEventApi,
  HousingEventApi,
  OwnerEventApi,
} from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { getHousingStatusApiLabel } from '~/models/HousingStatusApi';
import { OwnerApi } from '~/models/OwnerApi';

export const eventsTable = 'events';
export const ownerEventsTable = 'owner_events';
export const housingEventsTable = 'housing_events';
export const campaignEventsTable = 'campaign_events';
export const groupHousingEventsTable = 'group_housing_events';

export const Events = (transaction = db) =>
  transaction<EventDBO<any>>(eventsTable);
export const OwnerEvents = (transaction = db) =>
  transaction<OwnerEventDBO>(ownerEventsTable);
export const HousingEvents = (transaction = db) =>
  transaction<HousingEventDBO>(housingEventsTable);
export const CampaignEvents = (transaction = db) =>
  transaction<{ event_id: string; campaign_id: string }>(campaignEventsTable);

export const GroupHousingEvents = (transaction = db) =>
  transaction<GroupHousingEventDBO>(groupHousingEventsTable);

const insertHousingEvent = async (
  housingEvent: HousingEventApi,
): Promise<void> => {
  await insertManyHousingEvents([housingEvent]);
};

const insertManyHousingEvents = async (
  housingEvents: HousingEventApi[],
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
                : denormalizeStatus(housingEvent.old),
            })),
          );
          await HousingEvents(transaction).insert(
            chunk.map((housingEvent) => ({
              event_id: housingEvent.id,
              housing_id: housingEvent.housingId,
              housing_geo_code: housingEvent.housingGeoCode,
            })),
          );
        },
      );
    });
  }
};

function denormalizeStatus(housing: HousingApi | undefined) {
  return housing
    ? { ...housing, status: getHousingStatusApiLabel(housing.status) }
    : undefined;
}

const insertOwnerEvent = async (ownerEvent: OwnerEventApi): Promise<void> => {
  await db.transaction(async (transaction) => {
    await Events(transaction).insert(formatEventApi(ownerEvent));
    await OwnerEvents(transaction).insert({
      event_id: ownerEvent.id,
      owner_id: ownerEvent.ownerId,
    });
  });
};

const insertCampaignEvent = async (
  campaignEvent: CampaignEventApi,
): Promise<void> => {
  logger.info('Insert CampaignEventApi', campaignEvent);
  await db.transaction(async (transaction) => {
    await Events(transaction).insert(formatEventApi(campaignEvent));
    await CampaignEvents(transaction).insert({
      event_id: campaignEvent.id,
      campaign_id: campaignEvent.campaignId,
    });
  });
};

const insertManyGroupHousingEvents = async (
  groupHousingEvents: GroupHousingEventApi[],
): Promise<void> => {
  if (!groupHousingEvents.length) {
    return;
  }

  logger.debug('Insert many group housing events', {
    events: groupHousingEvents.length,
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
            group_id: event.groupId,
          })),
        );
      },
    );
  });
};

async function findEvents<T>(
  tableName: string,
  columnName: string,
  value: string,
): Promise<EventApi<T>[]> {
  const events = await Events()
    .select(`${eventsTable}.*`)
    .join(tableName, `${tableName}.event_id`, `${eventsTable}.id`)
    .where(`${tableName}.${columnName}`, value)
    .orderBy(`${eventsTable}.created_at`, 'desc');
  return events.map(parseEventApi<T>);
}

const findOwnerEvents = async (
  ownerId: string,
): Promise<EventApi<OwnerApi>[]> => {
  logger.info('List eventApi for owner with id', ownerId);
  return findEvents(ownerEventsTable, 'owner_id', ownerId);
};

const findHousingEvents = async (
  housingId: string,
): Promise<EventApi<HousingApi>[]> => {
  logger.info('List eventApi for housing with id', housingId);
  return findEvents(housingEventsTable, 'housing_id', housingId);
};

const findCampaignEvents = async (
  campaignId: string,
): Promise<EventApi<CampaignApi>[]> => {
  logger.info('List eventApi for campaign with id', campaignId);
  return findEvents(campaignEventsTable, 'campaign_id', campaignId);
};

const findGroupHousingEvents = async (
  housing: HousingApi,
  group?: GroupApi,
): Promise<EventApi<GroupApi>[]> => {
  logger.debug('Find group housing events', {
    housing: housing.id,
    geoCode: housing.geoCode,
    group: group?.id,
  });
  const events = await Events()
    .select(`${eventsTable}.*`)
    .join(
      groupHousingEventsTable,
      `${groupHousingEventsTable}.event_id`,
      `${eventsTable}.id`,
    )
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

export interface EventDBO<T> {
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

export function formatEventApi<T>(eventApi: EventApi<T>): EventDBO<T> {
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
    created_by: eventApi.createdBy,
  };
}

export function formatOwnerEventApi(event: OwnerEventApi): OwnerEventDBO {
  return {
    event_id: event.id,
    owner_id: event.ownerId,
  };
}

export function formatHousingEventApi(event: HousingEventApi): HousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
  };
}

export function formatGroupHousingEventApi(
  event: GroupHousingEventApi,
): GroupHousingEventDBO {
  return {
    event_id: event.id,
    housing_geo_code: event.housingGeoCode,
    housing_id: event.housingId,
    group_id: event.groupId,
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
  formatEventApi,
};
