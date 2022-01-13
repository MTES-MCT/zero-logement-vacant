import config from '../utils/config';
import authService from './auth.service';
import { EventKinds, OwnerEvent } from '../models/OwnerEvent';
import { parseISO } from 'date-fns';

const createEvent = async (ownerId: string, kind: EventKinds, content: string): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/events/creation`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({event : { ownerId, kind, content } }),
    })
        .then(_ => _.json())
        .then(_ => _.id);
};


const listByOwner = async (ownerId: string) => {

    return await fetch(`${config.apiEndpoint}/api/events/owner/${ownerId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseEvent(_)))
};

const parseEvent = (e: any): OwnerEvent => ({
    id: e.id,
    ownerId: e.ownerId,
    housingId: e.housingId,
    campaignId: e.campaignId,
    kind: e.kind,
    createdAt: e.createdAt ? parseISO(e.createdAt) : undefined,
    content: e.content,
    contactKind: e.contactKind
} as OwnerEvent)

const eventService = {
    createEvent,
    listByOwner
};

export default eventService;
