import db from './db';
import {
  CampaignEventApi,
  EventApi,
  HousingEventApi,
  OwnerEventApi,
} from '../models/EventApi';
import { EventKind } from '../../shared/types/EventKind';
import { EventCategory } from '../../shared/types/EventCategory';
import { OwnerApi } from '../models/OwnerApi';
import { HousingApi } from '../models/HousingApi';
import { CampaignApi } from '../models/CampaignApi';
import { EventSection } from '../../shared/types/EventSection';

export const eventsTable = 'events';
export const ownerEventsTable = 'owner_events';
export const housingEventsTable = 'housing_events';
export const campaignEventsTable = 'campaign_events';

const Events = () => db<EventDBO<any>>(eventsTable);
const OwnerEvents = () =>
  db<{ event_id: string; owner_id: string }>(ownerEventsTable);
const HousingEvents = () =>
  db<{ event_id: string; housing_id: string }>(housingEventsTable);
const CampaignEvents = () =>
  db<{ event_id: string; campaign_id: string }>(campaignEventsTable);

const insertHousingEvent = async (
  housingEvent: HousingEventApi
): Promise<void> => {
  insertManyHousingEvents([housingEvent]);
};

const insertManyHousingEvents = async (
  housingEvents: HousingEventApi[]
): Promise<void> => {
  console.log('Insert %d HousingEventApi', housingEvents.length);
  if (housingEvents.length) {
    await Events().insert(
      housingEvents.map((housingEvent) => formatEventApi(housingEvent))
    );
    await HousingEvents().insert(
      housingEvents.map((housingEvent) => ({
        event_id: housingEvent.id,
        housing_id: housingEvent.housingId,
      }))
    );
  }
};

const insertOwnerEvent = async (ownerEvent: OwnerEventApi): Promise<void> => {
  console.log('Insert OwnerEventApi', ownerEvent);
  await Events().insert(formatEventApi(ownerEvent));
  await OwnerEvents().insert({
    event_id: ownerEvent.id,
    owner_id: ownerEvent.ownerId,
  });
};

const insertCampaignEvent = async (
  campaignEvent: CampaignEventApi
): Promise<void> => {
  console.log('Insert CampaignEventApi', campaignEvent);
  await Events().insert(formatEventApi(campaignEvent));
  await CampaignEvents().insert({
    event_id: campaignEvent.id,
    campaign_id: campaignEvent.campaignId,
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

function formatEventApi<T>(eventApi: EventApi<T>): EventDBO<T> {
  return {
    id: eventApi.id,
    name: eventApi.name,
    kind: eventApi.kind,
    category: eventApi.category,
    section: eventApi.section,
    contact_kind: eventApi.contactKind,
    conflict: eventApi.conflict,
    old: eventApi.old,
    new: eventApi.new,
    created_at: eventApi.createdAt,
    created_by: eventApi.createdBy,
  };
}

function parseEventApi<T>(eventDbo: EventDBO<T>): EventApi<T> {
  return {
    id: eventDbo.id,
    name: eventDbo.name,
    kind: eventDbo.kind,
    category: eventDbo.category,
    section: eventDbo.section,
    contactKind: eventDbo.contact_kind,
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
  findOwnerEvents,
  findHousingEvents,
  findCampaignEvents,
  removeCampaignEvents,
  formatEventApi,
};
