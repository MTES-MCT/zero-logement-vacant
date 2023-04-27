import { Request, Response } from 'express';

import eventRepository from '../repositories/eventRepository';
import { constants } from 'http2';
import { EventDTO } from '../../shared/models/EventDTO';
import noteRepository from '../repositories/noteRepository';
import { toEventDTO } from '../models/EventApi';
import { toEventDTO as noteToEventDTO } from '../models/NoteApi';

const listByOwnerId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;

  console.log('List events for owner', ownerId);

  const events = await eventRepository.findOwnerEvents(ownerId);
  const notes = await noteRepository.findOwnerNotes(ownerId);

  const eventDTOs: EventDTO[] = [
    ...events.map((event) => ({
      ...toEventDTO(event),
      ownerId,
    })),
    ...notes.map((note) => ({
      ...noteToEventDTO(note),
      ownerId,
    })),
  ];

  return response.status(constants.HTTP_STATUS_OK).json(eventDTOs);
};

const listByHousingId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const housingId = request.params.housingId;

  console.log('List events for housing', housingId);

  const events = await eventRepository.findHousingEvents(housingId);
  const notes = await noteRepository.findHousingNotes(housingId);

  const eventDTOs: EventDTO[] = [
    ...events.map((event) => ({
      ...toEventDTO(event),
      housingId,
    })),
    ...notes.map((note) => ({
      ...noteToEventDTO(note),
      housingId,
    })),
  ];

  return response.status(constants.HTTP_STATUS_OK).json(eventDTOs);
};

const eventController = {
  listByOwnerId,
  listByHousingId,
};

export default eventController;
