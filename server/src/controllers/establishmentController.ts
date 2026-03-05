import { Request, RequestHandler, Response } from 'express';
import { constants } from 'http2';

import {
  EstablishmentDTO,
  EstablishmentFiltersDTO,
  UserRole
} from '@zerologementvacant/models';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import { createLogger } from '~/infra/logger';
import establishmentRepository from '~/repositories/establishmentRepository';

const logger = createLogger('establishmentController');

async function list(
  request: Request<
    never,
    ReadonlyArray<EstablishmentDTO>,
    never,
    EstablishmentFiltersDTO
  >,
  response: Response<ReadonlyArray<EstablishmentDTO>>
) {
  const { query, user } = request;
  logger.info('List establishments', {
    query
  });

  const filters: EstablishmentFiltersDTO = query;
  const establishments = await establishmentRepository.find({
    filters,
    includes:
      // Include the establishment's users only for admin and usual roles
      !!user && [UserRole.ADMIN, UserRole.USUAL].includes(user.role)
        ? ['users']
        : []
  });
  response.status(constants.HTTP_STATUS_OK).json(establishments);
}

const get: RequestHandler<{ id: string }, EstablishmentDTO> = async (
  request,
  response
): Promise<void> => {
  const { params } = request;
  logger.info('Get establishment', { id: params.id });

  const establishment = await establishmentRepository.get(params.id);
  if (!establishment) {
    throw new EstablishmentMissingError(params.id);
  }
  
  response.status(constants.HTTP_STATUS_OK).json(establishment);
}

export default {
  list,
  get
};
