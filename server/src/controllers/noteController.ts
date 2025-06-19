import { isAdmin, NoteDTO, NotePayloadDTO } from '@zerologementvacant/models';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import HousingMissingError from '~/errors/housingMissingError';
import NoteMissingError from '~/errors/noteMissingError';
import { createLogger } from '~/infra/logger';
import { HousingNoteApi, NoteApi, toNoteDTO } from '~/models/NoteApi';
import housingRepository from '~/repositories/housingRepository';
import noteRepository from '~/repositories/noteRepository';

const logger = createLogger('noteController');

interface PathParams extends Record<string, string> {
  id: string;
}

async function findByHousing(
  request: Request<PathParams>,
  response: Response<NoteDTO[]>
) {
  const { params } = request;
  logger.debug('Finding notes by housing...', { housing: params.id });

  const notes = await noteRepository.findByHousing(params.id);
  response.status(constants.HTTP_STATUS_OK).json(notes.map(toNoteDTO));
}

async function createByHousing(
  request: Request<PathParams, NoteDTO, NotePayloadDTO, never>,
  response: Response<NoteDTO>
) {
  const { body, establishment, params, user } = request as AuthenticatedRequest<
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
    createdBy: user.id,
    createdAt: new Date().toJSON(),
    updatedAt: null,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    creator: user
  };
  await noteRepository.createByHousing(note);
  response.status(constants.HTTP_STATUS_CREATED).json(toNoteDTO(note));
}

const update: RequestHandler<{ id: string }, NoteDTO, NotePayloadDTO> = async (
  request,
  response
) => {
  const { body, params, user } = request as AuthenticatedRequest<
    { id: string },
    NoteDTO,
    NotePayloadDTO
  >;
  logger.debug('Updating note...', { id: params.id, content: body.content });

  const note = await noteRepository.get(params.id);
  if (!note) {
    throw new NoteMissingError(params.id);
  }

  // Allow the note creator or an admin to update the note
  if (!isAdmin(user) && note.creator.id !== user.id) {
    logger.warn('Unauthorized update attempt', {
      user: user.id,
      note: note.id
    });
    response.status(constants.HTTP_STATUS_FORBIDDEN).send();
    return;
  }

  const updated: NoteApi = {
    ...note,
    content: body.content,
    updatedAt: new Date().toJSON()
  };
  await noteRepository.update(updated);
  response.status(constants.HTTP_STATUS_OK).json(toNoteDTO(updated));
};

const noteController = {
  createByHousing,
  findByHousing,
  update
};

export default noteController;
