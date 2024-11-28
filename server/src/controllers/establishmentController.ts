import { Request, Response } from 'express';
import { constants } from 'http2';

import establishmentRepository from '~/repositories/establishmentRepository';
import {
  EstablishmentDTO,
  EstablishmentFiltersDTO
} from '@zerologementvacant/models';
import { logger } from '~/infra/logger';

async function list(
  request: Request<
    never,
    ReadonlyArray<EstablishmentDTO>,
    never,
    EstablishmentFiltersDTO
  >,
  response: Response<ReadonlyArray<EstablishmentDTO>>
) {
  const { query } = request;
  logger.info('List establishments', {
    query
  });

  const establishments = await establishmentRepository.find({
    filters: query
  });
  response.status(constants.HTTP_STATUS_OK).json(establishments);
}

export default {
  list
};
