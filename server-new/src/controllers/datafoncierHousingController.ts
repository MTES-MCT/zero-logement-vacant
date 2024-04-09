import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';

import HousingMissingError from '~/errors/housingMissingError';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';

const datafoncierHousingRepository = createDatafoncierHousingRepository();

const findOne = async (request: Request, response: Response) => {
  const { establishment } = request as AuthenticatedRequest;

  const geoCode = request.params.localId.substring(0, 5);
  if (!establishment.geoCodes.includes(geoCode)) {
    throw new HousingMissingError(request.params.id);
  }

  const housing = await datafoncierHousingRepository.findOne({
    idlocal: request.params.localId,
  });
  if (!housing) {
    throw new HousingMissingError(request.params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
};

export default {
  findOne,
};
