import db from './db';
import {
  CampaignEventApi,
  EventApi,
  GroupHousingEventApi,
  HousingEventApi,
  OwnerEventApi,
} from '../models/EventApi';
import { EventKind } from '../../shared/types/EventKind';
import { EventCategory } from '../../shared/types/EventCategory';
import { OwnerApi } from '../models/OwnerApi';
import { HousingApi } from '../models/HousingApi';
import { CampaignApi } from '../models/CampaignApi';
import { EventSection } from '../../shared/types/EventSection';
import { getHousingStatusApiLabel } from '../models/HousingStatusApi';
import { GroupApi } from '../models/GroupApi';
import { logger } from '../utils/logger';

export const eventsTable = 'events';
export const ownerEventsTable = 'owner_events';
export const housingEventsTable = 'housing_events';
export const campaignEventsTable = 'campaign_events';
export const groupHousingEventsTable = 'group_housing_events';

export const Events = (transaction = db) =>
  transaction<EventDBO<any>>(eventsTable);
export const OwnerEvents = (transaction = db) =>
  transaction<{ event_id: string; owner_id: string }>(ownerEventsTable);
export const HousingEvents = (transaction = db) =>
  transaction<{
    event_id: string;
    housing_id: string;
    housing_geo_code: string;
  }>(housingEventsTable);
export const CampaignEvents = (transaction = db) =>
  transaction<{ event_id: string; campaign_id: string }>(campaignEventsTable);
export const GroupHousingEvents = (transaction = db) =>
  transaction<{
    event_id: string;
    housing_id: string;
    housing_geo_code: string;
    group_id: string | null;
  }>(groupHousingEventsTable);

const insertHousingEvent = async (
  housingEvent: HousingEventApi
): Promise<void> => {
  await insertManyHousingEvents([housingEvent]);
};

const insertManyHousingEvents = async (
  housingEvents: HousingEventApi[]
): Promise<void> => {
  if (housingEvents.length) {
    await Events().insert(
      housingEvents.map((housingEvent) => ({
        ...formatEventApi(housingEvent),
        new: Array.isArray(housingEvent.new)
          ? JSON.stringify(housingEvent.new)
          : denormalizeStatus(housingEvent.new),
        old: Array.isArray(housingEvent.old)
          ? JSON.stringify(housingEvent.old)
          : denormalizeStatus(housingEvent.old),
      }))
    );
    await HousingEvents().insert(
      housingEvents.map((housingEvent) => ({
        event_id: housingEvent.id,
        housing_id: housingEvent.housingId,
        housing_geo_code: housingEvent.housingGeoCode,
      }))
    );
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
  campaignEvent: CampaignEventApi
): Promise<void> => {
  console.log('Insert CampaignEventApi', campaignEvent);
  await db.transaction(async (transaction) => {
    await Events(transaction).insert(formatEventApi(campaignEvent));
    await CampaignEvents(transaction).insert({
      event_id: campaignEvent.id,
      campaign_id: campaignEvent.campaignId,
    });
  });
};

const insertManyGroupHousingEvents = async (
  groupHousingEvents: GroupHousingEventApi[]
): Promise<void> => {
  if (!groupHousingEvents.length) {
    return;
  }

  logger.debug('Insert many group housing events', {
    events: groupHousingEvents.length,
  });
  await db.transaction(async (transaction) => {
    await Events(transaction).insert(groupHousingEvents.map(formatEventApi));
    await GroupHousingEvents(transaction).insert(
      groupHousingEvents.map((event) => ({
        event_id: event.id,
        housing_geo_code: event.housingGeoCode,
        housing_id: event.housingId,
        group_id: event.groupId,
      }))
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
    .where(`${tableName}.${columnName}`, value)
    .orderBy(`${eventsTable}.created_at`, 'desc');
  return events.map(parseEventApi<T>);
}

const findOwnerEvents = async (
  ownerId: string
): Promise<EventApi<OwnerApi>[]> => {
  console.log('List eventApi for owner with id', ownerId);
  return findEvents(ownerEventsTable, 'owner_id', ownerId);
};

const findHousingEvents = async (
  housingId: string
): Promise<EventApi<HousingApi>[]> => {
  console.log('List eventApi for housing with id', housingId);
  return findEvents(housingEventsTable, 'housing_id', housingId);
};

const findCampaignEvents = async (
  campaignId: string
): Promise<EventApi<CampaignApi>[]> => {
  console.log('List eventApi for campaign with id', campaignId);
  return findEvents(campaignEventsTable, 'campaign_id', campaignId);
};

const findGroupHousingEvents = async (
  housing: HousingApi,
  group?: GroupApi
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
      `${eventsTable}.id`
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

const removeCampaignEvents = async (campaignIds: string[]): Promise<void> => {
  console.log('Delete eventApi for campaign with ids', campaignIds);
  await db(campaignEventsTable).whereIn('campaign_id', campaignIds).delete();
};

interface EventDBO<T> {
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
