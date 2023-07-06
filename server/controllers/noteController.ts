import { Request, Response } from 'express';

import noteRepository from '../repositories/noteRepository';
import { constants } from 'http2';

const listByOwnerId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;

  console.log('List notes for owner', ownerId);

  return noteRepository
    .findOwnerNotes(ownerId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const listByHousingId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const housingId = request.params.housingId;

  console.log('List notes for housing', housingId);

  return noteRepository
    .findHousingNotes(housingId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const noteController = {
  listByOwnerId,
  listByHousingId,
};

export default noteController;
