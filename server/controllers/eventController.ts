import { Request, Response } from 'express';

import eventRepository from '../repositories/eventRepository';
import { constants } from 'http2';
import async from 'async';
import housingRepository from '../repositories/housingRepository';
import HousingMissingError from '../errors/housingMissingError';
import { AuthenticatedRequest } from 'express-jwt';
import { EventApi } from '../models/EventApi';
import { OwnerApi } from '../models/OwnerApi';
import ownerRepository from '../repositories/ownerRepository';

const listByOwnerId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;

  console.log('List events for owner', ownerId);

  const events = await eventRepository.findOwnerEvents(ownerId);

  return response.status(constants.HTTP_STATUS_OK).json(events);
};

const listByHousingId = async (request: Request, response: Response) => {
  const housingId = request.params.housingId;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  console.log('List events for housing', housingId);

  const housing = await housingRepository.get(housingId, establishmentId);
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const [housingEvents, owners, groupHousingEvents] = await Promise.all([
    eventRepository.findHousingEvents(housing.id),
    ownerRepository.listByHousing(housing),
    eventRepository.findGroupHousingEvents(housing),
  ]);

  const ownerEvents: EventApi<OwnerApi>[] = await async.concat(
    owners.map((_) => _.id),
    async (ownerId: string) => eventRepository.findOwnerEvents(ownerId)
  );

  response
    .status(constants.HTTP_STATUS_OK)
    .json([...ownerEvents, ...housingEvents, ...groupHousingEvents]);
};

const eventController = {
  listByOwnerId,
  listByHousingId,
};

export default eventController;
