import { Request, Response } from 'express';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import { NoteDTO, NotePayloadDTO } from '@zerologementvacant/models';
import noteRepository from '~/repositories/noteRepository';
import { logger } from '~/infra/logger';
import { NoteApi, toNoteDTO } from '~/models/NoteApi';
import { AuthenticatedRequest } from 'express-jwt';

async function listByOwnerId(request: Request, response: Response) {
  const ownerId = request.params.ownerId;

  logger.info('List notes for owner', ownerId);

  const notes = await noteRepository.findOwnerNotes(ownerId);
  response.status(constants.HTTP_STATUS_OK).json(notes);
}

async function listByHousingId(request: Request, response: Response) {
  const housingId = request.params.housingId;

  logger.info('List notes for housing', housingId);

  const notes = await noteRepository.findHousingNotes(housingId);
  response.status(constants.HTTP_STATUS_OK).json(notes);
}

interface PathParams extends Record<string, string> {
  id: string;
}

async function createByHousing(
  request: Request<PathParams, NoteDTO, NotePayloadDTO, never>,
  response: Response<NoteDTO>
) {
  const { auth, body } = request as AuthenticatedRequest<
    PathParams,
    NoteDTO,
    NotePayloadDTO,
    never
  >;
  const note: NoteApi = {
    id: uuidv4(),
    content: body.content,
    noteKind: 'Note',
    createdBy: auth.userId,
    createdAt: new Date()
  };
  response.status(constants.HTTP_STATUS_CREATED).json(toNoteDTO(note));
}

const noteController = {
  createByHousing,
  listByOwnerId,
  listByHousingId
};

export default noteController;
