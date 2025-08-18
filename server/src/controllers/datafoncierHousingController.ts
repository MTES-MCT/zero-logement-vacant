import type { DatafoncierHousing } from '@zerologementvacant/models';
import { type RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';

import HousingMissingError from '~/errors/housingMissingError';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';

const datafoncierHousingRepository = createDatafoncierHousingRepository();

interface FindOneParams extends Record<string, string> {
  localId: string;
}

const findOne: RequestHandler<FindOneParams, DatafoncierHousing> = async (
  request,
  response
) => {
  const { establishment } = request as AuthenticatedRequest<
    FindOneParams,
    DatafoncierHousing
  >;

  const housing = await datafoncierHousingRepository.findOne({
    idlocal: request.params.localId
  });
  if (!housing || !establishment.geoCodes.includes(housing.idcom)) {
    throw new HousingMissingError(request.params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
};

export default {
  findOne
};
