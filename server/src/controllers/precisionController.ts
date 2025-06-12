import { Precision, PRECISION_EQUIVALENCE } from '@zerologementvacant/models';
import { Array } from 'effect';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import HousingMissingError from '~/errors/housingMissingError';
import PrecisionMissingError from '~/errors/precisionMissingError';
import { startTransaction } from '~/infra/database/transaction';
import { PrecisionHousingEventApi } from '~/models/EventApi';
import {
  toOldPrecision,
  toPrecisionDTO,
  wasPrecision,
  wasVacancyReason
} from '~/models/PrecisionApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import precisionRepository from '~/repositories/precisionRepository';

const find: RequestHandler<never, Precision[]> = async (
  _,
  response
): Promise<void> => {
  const precisions = await precisionRepository.find();
  response
    .status(constants.HTTP_STATUS_OK)
    .json(precisions.map(toPrecisionDTO));
};

interface PathParams extends Record<string, string> {
  id: string;
}

const findByHousing: RequestHandler<PathParams, Precision[]> = async (
  request,
  response
): Promise<void> => {
  const { establishment, params } = request as AuthenticatedRequest<
    PathParams,
    Precision[]
  >;

  const [housing, precisions] = await Promise.all([
    housingRepository.findOne({
      geoCode: establishment.geoCodes,
      id: params.id
    }),
    precisionRepository.find({
      filters: {
        housingId: [params.id]
      }
    })
  ]);
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  response
    .status(constants.HTTP_STATUS_OK)
    .json(precisions.map(toPrecisionDTO));
};

const updatePrecisionsByHousing: RequestHandler<
  PathParams,
  Precision[]
> = async (request, response): Promise<void> => {
  const { auth, body, establishment, params } = request as AuthenticatedRequest<
    PathParams,
    Precision[]
  >;

  const [housing, precisions] = await Promise.all([
    housingRepository.findOne({
      geoCode: establishment.geoCodes,
      id: params.id
    }),
    body.length > 0
      ? precisionRepository.find({
          filters: {
            id: body
          }
        })
      : Promise.resolve([])
  ]);
  if (!housing) {
    throw new HousingMissingError(params.id);
  }
  if (precisions.length < body.length) {
    throw new PrecisionMissingError(...body);
  }

  const deprecatedPrecisions: string[] = precisions
    .filter((precision) => wasPrecision(precision.category))
    .map(toOldPrecision);
  const deprecatedVacancyReasons: string[] = precisions
    .filter((precision) => wasVacancyReason(precision.category))
    .map(toOldPrecision);

  const existingPrecisions = await precisionRepository.find({
    filters: {
      housingId: [housing.id]
    }
  });
  const substract = Array.differenceWith(PRECISION_EQUIVALENCE);
  const removed = substract(existingPrecisions, precisions);
  const added = substract(precisions, existingPrecisions);
  const events = [
    ...added.map<PrecisionHousingEventApi>((precision) => ({
      id: uuidv4(),
      type: 'housing:precision-attached',
      name: 'Ajout d’une précision au logement',
      nextOld: null,
      nextNew: {
        category: precision.category,
        label: precision.label
      },
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      precisionId: precision.id,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    })),
    ...removed.map<PrecisionHousingEventApi>((precision) => ({
      id: uuidv4(),
      type: 'housing:precision-detached',
      name: 'Retrait d’une précision du logement',
      nextOld: {
        category: precision.category,
        label: precision.label
      },
      nextNew: null,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      precisionId: precision.id,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    }))
  ];

  await startTransaction(async () => {
    await Promise.all([
      housingRepository.update({
        ...housing,
        deprecatedPrecisions,
        deprecatedVacancyReasons
      }),
      precisionRepository.link(housing, precisions),
      eventRepository.insertManyPrecisionHousingEvents(events)
    ]);
  });
  response
    .status(constants.HTTP_STATUS_OK)
    .json(precisions.map(toPrecisionDTO));
};

const precisionController = {
  find,
  findByHousing,
  updatePrecisionsByHousing
};

export default precisionController;
