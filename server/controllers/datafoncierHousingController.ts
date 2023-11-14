import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';

import housingRepository from '../repositories/datafoncierHousingApiRepository';
import HousingMissingError from '../errors/housingMissingError';

const find = async (request: Request, response: Response) => {
  const { query } = request as AuthenticatedRequest;
  const geoCode = query.geoCode as string;
  const idpar = query.idpar as string | undefined;

  const housingList = await housingRepository.find({
    filters: {
      geoCode,
      idpar,
    },
  });

  response.status(constants.HTTP_STATUS_OK).json(housingList);
};

const findOne = async (request: Request, response: Response) => {
  // TODO: add idlocal only in my establishment
  const housing = await housingRepository.findOne({
    localId: request.params.id,
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
