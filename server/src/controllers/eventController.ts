import { EventDTO, EventUnionDTO } from '@zerologementvacant/models';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';

import HousingMissingError from '~/errors/housingMissingError';
import { logger } from '~/infra/logger';
import { toEventDTO } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import ownerRepository from '~/repositories/ownerRepository';

const listByOwnerId: RequestHandler<
  { id: string },
  ReadonlyArray<EventDTO<'owner:updated'>>,
  never,
  never
> = async (request, response) => {
  const { params } = request;
  logger.info('List owner events', { id: params.id });

  const events = await eventRepository.find({
    filters: {
      types: ['owner:updated'],
      owners: [params.id]
    }
  });
  response.status(constants.HTTP_STATUS_OK).json(events);
};

type FindByHousingResponse = ReadonlyArray<
  EventUnionDTO<
    | 'housing:created'
    | 'housing:occupancy-updated'
    | 'housing:status-updated'
    | 'housing:precision-attached'
    | 'housing:precision-detached'
    | 'housing:owner-attached'
    | 'housing:owner-updated'
    | 'housing:owner-detached'
    | 'housing:group-attached'
    | 'housing:group-detached'
    | 'housing:group-removed'
    | 'housing:group-archived'
    | 'housing:campaign-attached'
    | 'housing:campaign-detached'
    | 'housing:campaign-removed'
    | 'owner:updated'
  >
>;

async function listByHousingId(
  request: Request,
  response: Response<FindByHousingResponse>
) {
  const { establishment, params } = request as AuthenticatedRequest<
    { id: string },
    FindByHousingResponse,
    never,
    never
  >;
  logger.info('List housing events', { id: params.id });

  const housing = await housingRepository.findOne({
    id: params.id,
    geoCode: establishment.geoCodes
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  const owners = await ownerRepository.findByHousing(housing);
  const [ownerEvents, housingEvents] = await Promise.all([
    eventRepository.find({
      filters: {
        types: ['owner:updated'],
        owners: owners.map((owner) => owner.id)
      }
    }),
    eventRepository.find({
      filters: {
        types: [
          'housing:created',
          'housing:occupancy-updated',
          'housing:status-updated',
          'housing:precision-attached',
          'housing:precision-detached',
          'housing:owner-attached',
          'housing:owner-updated',
          'housing:owner-detached',
          'housing:group-attached',
          'housing:group-detached',
          'housing:group-removed',
          'housing:group-archived',
          'housing:campaign-attached',
          'housing:campaign-detached',
          'housing:campaign-removed'
        ],
        housings: [{ geoCode: housing.geoCode, id: housing.id }]
      }
    })
  ]);

  const events = [...ownerEvents, ...housingEvents];
  // TODO: sort by createdAt in descending order
  response
    .status(constants.HTTP_STATUS_OK)
    .json(events.map(toEventDTO) as FindByHousingResponse);
}

const eventController = {
  listByOwnerId,
  listByHousingId
};

export default eventController;
