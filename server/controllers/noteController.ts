import { Request, Response } from 'express';
import { constants } from 'http2';

import noteRepository from '../repositories/noteRepository';
import { logger } from '../utils/logger';

async function listByOwnerId(request: Request, response: Response) {
  const ownerId = request.params.ownerId;

  logger.info('List notes for owner', ownerId);

  const notes = await noteRepository.findOwnerNotes(ownerId);
  response.status(constants.HTTP_STATUS_OK).json(notes);
}

async function listByHousingId(request: Request, response: Response) {
  const housingId = request.params.housingId;

  logger.info('List notes for housing', housingId);

  const notes = noteRepository.findHousingNotes(housingId);
  response.status(constants.HTTP_STATUS_OK).json(notes);
}

const noteController = {
  listByOwnerId,
  listByHousingId,
};

export default noteController;
