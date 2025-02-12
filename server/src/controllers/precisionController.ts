import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';

import { Precision } from '@zerologementvacant/models';
import precisionRepository from '~/repositories/precisionRepository';
import {
  toOldPrecision,
  toPrecisionDTO,
  wasPrecision,
  wasVacancyReason
} from '~/models/PrecisionApi';
import housingRepository from '~/repositories/housingRepository';
import HousingMissingError from '~/errors/housingMissingError';
import PrecisionMissingError from '~/errors/precisionMissingError';
import { startTransaction } from '~/infra/database/transaction';

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
  const { body, establishment, params } = request as AuthenticatedRequest<
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

  await startTransaction(async () => {
    await Promise.all([
      housingRepository.update({
        ...housing,
        deprecatedPrecisions,
        deprecatedVacancyReasons
      }),
      precisionRepository.link(housing, precisions)
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
