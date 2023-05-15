import { Request, Response } from 'express';

import eventRepository from '../repositories/eventRepository';
import { constants } from 'http2';

const listByOwnerId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;

  console.log('List events for owner', ownerId);

  const events = await eventRepository.findOwnerEvents(ownerId);

  return response.status(constants.HTTP_STATUS_OK).json(events);
};

const listByHousingId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const housingId = request.params.housingId;

  console.log('List events for housing', housingId);

  const events = await eventRepository.findHousingEvents(housingId);

  return response.status(constants.HTTP_STATUS_OK).json(events);
};

const eventController = {
  listByOwnerId,
  listByHousingId,
};

export default eventController;
