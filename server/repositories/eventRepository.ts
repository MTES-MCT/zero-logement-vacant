import db from './db';
import { EventApi } from '../models/EventApi';

export const eventsTable = 'events';


const insert = async (eventApi: EventApi): Promise<EventApi> => {
    try {
        return db(eventsTable)
            .insert(formatEventApi(eventApi))
            .returning('*')
            .then(_ => _[0]);
    } catch (err) {
        console.error('Inserting event failed', err, eventApi);
        throw new Error('Inserting event failed');
    }
}

const listByOwnerId = async (ownerId: string): Promise<EventApi[]> => {
    try {
        return db(eventsTable)
            .where('owner_id', ownerId)
            .orderBy('created_at', 'desc')
            .then(_ => _.map(_ => parseEventApi(_)))
    } catch (err) {
        console.error('Listing events failed', err);
        throw new Error('Listing events failed');
    }
}

const listByHousingId = async (housingId: string): Promise<EventApi[]> => {
    try {
        return db(eventsTable)
            .where('housing_id', housingId)
            .orderBy('created_at', 'desc')
            .then(_ => _.map(_ => parseEventApi(_)))
    } catch (err) {
        console.error('Listing events failed', err);
        throw new Error('Listing events failed');
    }
}

const insertList = async (events: EventApi[]): Promise<EventApi[]> => {

    try {
        return db(eventsTable)
            .insert(events.map(_ => formatEventApi(_)))
            .returning('*');
    } catch (err) {
        console.error('Inserting events failed', err);
        throw new Error('Inserting events failed');
    }
}

const deleteEventsFromCampaigns = async (campaignIds: string[]): Promise<number> => {
    try {
        return db(eventsTable)
            .delete()
            .whereIn('campaign_id', campaignIds)

    } catch (err) {
        console.error('Removing events from campaign failed', err, campaignIds);
        throw new Error('Removing events from campaign failed');
    }
}

const parseEventApi = (result: any) => <EventApi>{
    id: result.id,
    ownerId: result.owner_id,
    housingId: result.housing_id,
    campaignId: result.campaign_id,
    kind: result.kind,
    createdBy: result.created_by,
    createdAt: result.created_at,
    content: result.content,
    contactKind: result.contact_kind
}


const formatEventApi = (eventApi: EventApi) => ({
    id: eventApi.id,
    owner_id: eventApi.ownerId,
    housing_id: eventApi.housingId,
    campaign_id: eventApi.campaignId,
    kind: eventApi.kind,
    created_by: eventApi.createdBy,
    created_at: eventApi.createdAt,
    content: eventApi.content,
    contact_kind: eventApi.contactKind
})

export default {
    insert,
    listByOwnerId,
    listByHousingId,
    insertList,
    deleteEventsFromCampaigns
}
