import config from '../utils/config';
import authService from './auth.service';
import { EventKinds } from '../models/OwnerEvent';
import { OwnerEvent } from '../models/OwnerEvent';
import { parseISO } from "date-fns";
import { getCampaignHousingState } from '../models/CampaignHousingState';

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
    kind: e.kind,
    createdAt: e.createdAt ? parseISO(e.createdAt) : undefined,
    content: e.content,
    details: parseInt(e.kind) === EventKinds.StatusChange ? e.details.replace(/([0-9])/, (a: number) => getCampaignHousingState(a).title) : e.details
} as OwnerEvent)

const eventService = {
    createEvent,
    listByOwner
};

export default eventService;
