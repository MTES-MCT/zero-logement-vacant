import config from '../utils/config';
import authService from './auth.service';
import { Event } from '../models/Event';
import { parseISO } from 'date-fns';

const listByOwner = async (ownerId: string) => {

    return await fetch(`${config.apiEndpoint}/api/events/owner/${ownerId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseEvent(_)))
};

const listByHousing = async (housingId: string) => {

    return await fetch(`${config.apiEndpoint}/api/events/housing/${housingId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseEvent(_)))
};

const parseEvent = (e: any): Event => ({
    id: e.id,
    ownerId: e.ownerId,
    housingId: e.housingId,
    campaignId: e.campaignId,
    kind: e.kind,
    createdAt: e.createdAt ? parseISO(e.createdAt) : undefined,
    content: e.content,
    contactKind: e.contactKind
} as Event)

const eventService = {
    listByOwner,
    listByHousing
};

export default eventService;
