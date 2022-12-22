import config from '../utils/config';
import authService from './auth.service';
import { Event } from '../models/Event';
import { parseISO } from 'date-fns';
import { Note } from '../models/Note';
import { EventCreationDTO } from '../../../shared/models/EventDTO';

const listByOwner = async (ownerId: string) => {
  return await fetch(`${config.apiEndpoint}/api/events/owner/${ownerId}`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  })
    .then((_) => _.json())
    .then((_) => _.map((_: any) => parseEvent(_)));
};

const listByHousing = async (housingId: string) => {
  return await fetch(`${config.apiEndpoint}/api/events/housing/${housingId}`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  })
    .then((_) => _.json())
    .then((_) => _.map((_: any) => parseEvent(_)));
};

const createNote = async (note: Note): Promise<void> => {
  await fetch(`${config.apiEndpoint}/api/events`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toEventCreationDTO(note)),
  });
};

const toEventCreationDTO = (note: Note): EventCreationDTO => ({
  title: note.title,
  content: note.content,
  contactKind: note.contactKind,
  ownerId: note.owner?.id,
  housingId: note.housingList?.map((_) => _.id),
});

const parseEvent = (e: any): Event =>
  ({
    id: e.id,
    ownerId: e.ownerId,
    housingId: e.housingId,
    campaignId: e.campaignId,
    kind: e.kind,
    createdAt: e.createdAt ? parseISO(e.createdAt) : undefined,
    title: e.title,
    content: e.content,
    contactKind: e.contactKind,
  } as Event);

const eventService = {
  listByOwner,
  listByHousing,
  createNote,
};

export default eventService;
