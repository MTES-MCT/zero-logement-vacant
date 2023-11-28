import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';

import datafoncierHousingRepository from '../repositories/datafoncierHousingApiRepository';
import HousingMissingError from '../errors/housingMissingError';

const find = async (request: Request, response: Response) => {
  const { query } = request as AuthenticatedRequest;
  const geoCode = query.geoCode as string;
  const idpar = query.idpar as string | undefined;

  const housingList = await datafoncierHousingRepository.find({
    filters: {
      geoCode,
      idpar,
    },
  });

  response.status(constants.HTTP_STATUS_OK).json(housingList);
};

const findOne = async (request: Request, response: Response) => {
  const { establishment } = request as AuthenticatedRequest;

  const geoCode = request.params.localId.substring(0, 5);
  if (!establishment.geoCodes.includes(geoCode)) {
    throw new HousingMissingError(request.params.id);
  }

  const housing = await datafoncierHousingRepository.findOne({
    localId: request.params.localId,
  });
  if (!housing) {
    throw new HousingMissingError(request.params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
};

export default {
  find,
  findOne,
};
