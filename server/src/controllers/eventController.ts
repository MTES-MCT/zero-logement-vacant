import { Request, Response } from 'express';

import eventRepository from '~/repositories/eventRepository';
import { constants } from 'http2';
import async from 'async';
import housingRepository from '~/repositories/housingRepository';
import HousingMissingError from '~/errors/housingMissingError';
import { AuthenticatedRequest } from 'express-jwt';
import { EventApi } from '~/models/EventApi';
import { OwnerApi } from '~/models/OwnerApi';
import ownerRepository from '~/repositories/ownerRepository';
import { logger } from '~/infra/logger';

async function listByOwnerId(request: Request, response: Response) {
  const { id, } = request.params;
  logger.info('List owner events', { id, });

  const events = await eventRepository.findOwnerEvents(id);
  response.status(constants.HTTP_STATUS_OK).json(events);
}

async function listByHousingId(request: Request, response: Response) {
  const { establishment, params, } = request as AuthenticatedRequest;
  logger.info('List housing events', { id: params.id, });

  const housing = await housingRepository.findOne({
    id: params.id,
    geoCode: establishment.geoCodes,
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  const [housingEvents, owners, groupHousingEvents] = await Promise.all([
    eventRepository.findHousingEvents(housing.id),
    ownerRepository.findByHousing(housing),
    eventRepository.findGroupHousingEvents(housing)
  ]);

  const ownerEvents: EventApi<OwnerApi>[] = await async.flatMap(
    owners.map((_) => _.id),
    async (id: string) => eventRepository.findOwnerEvents(id)
  );

  response
    .status(constants.HTTP_STATUS_OK)
    .json([...ownerEvents, ...housingEvents, ...groupHousingEvents]);
}

const eventController = {
  listByOwnerId,
  listByHousingId,
};

export default eventController;
