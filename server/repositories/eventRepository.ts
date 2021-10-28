import db from './db';
import { EventApi } from '../models/EventApi';

export const eventsTable = 'events';


const insert = async (eventApi: EventApi): Promise<EventApi> => {
    try {
        return db(eventsTable)
            .insert(eventApi)
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
            .where('ownerId', ownerId)
            .orderBy('createdAt', 'desc')
    } catch (err) {
        console.error('Listing events failed', err);
        throw new Error('Listing events failed');
    }
}

export default {
    insert,
    listByOwnerId
}
