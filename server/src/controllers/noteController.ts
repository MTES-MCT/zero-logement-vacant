import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import { NoteDTO, NotePayloadDTO } from '@zerologementvacant/models';
import noteRepository from '~/repositories/noteRepository';
import { createLogger } from '~/infra/logger';
import { HousingNoteApi, toNoteDTO } from '~/models/NoteApi';
import housingRepository from '~/repositories/housingRepository';
import HousingMissingError from '~/errors/housingMissingError';

const logger = createLogger('noteController');

interface PathParams extends Record<string, string> {
  id: string;
}

async function findByHousing(
  request: Request<PathParams>,
  response: Response<NoteDTO[]>
) {
  const { params } = request;
  logger.debug('Find notes by housing', { housing: params.id });

  const notes = await noteRepository.findHousingNotes(params.id);
  response.status(constants.HTTP_STATUS_OK).json(notes.map(toNoteDTO));
}

async function createByHousing(
  request: Request<PathParams, NoteDTO, NotePayloadDTO, never>,
  response: Response<NoteDTO>
) {
  const { auth, body, establishment, params } = request as AuthenticatedRequest<
    PathParams,
    NoteDTO,
    NotePayloadDTO,
    never
  >;
  logger.debug('Create a note by housing', { housing: params.id, note: body });

  const housing = await housingRepository.findOne({
    geoCode: establishment.geoCodes,
    id: params.id
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  const note: HousingNoteApi = {
    id: uuidv4(),
    content: body.content,
    noteKind: 'Note courante',
    createdBy: auth.userId,
    createdAt: new Date(),
    housingId: housing.id,
    housingGeoCode: housing.geoCode
  };
  await noteRepository.createByHousing(note);
  response.status(constants.HTTP_STATUS_CREATED).json(toNoteDTO(note));
}

const noteController = {
  createByHousing,
  findByHousing
};

export default noteController;
