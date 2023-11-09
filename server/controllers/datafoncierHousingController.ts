import { Request, Response } from 'express';
import { constants } from 'http2';

import housingRepository from '../repositories/datafoncierHousingApiRepository';
import HousingMissingError from '../errors/housingMissingError';

const findOne = async (request: Request, response: Response) => {
  const housing = await housingRepository.findOne({
    localId: request.params.id,
  });
  if (!housing) {
    throw new HousingMissingError(request.params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
};

export default {
  findOne,
};
