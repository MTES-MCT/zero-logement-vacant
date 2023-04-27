import { Request, Response } from 'express';

import noteRepository from '../repositories/noteRepository';
import { constants } from 'http2';
import { v4 as uuid } from 'uuid';
import { HousingNoteApi, NoteApi, OwnerNoteApi } from '../models/NoteApi';
import { body, ValidationChain } from 'express-validator';
import { NoteCreationDTO } from '../../shared/models/NoteDTO';
import ownerRepository from '../repositories/ownerRepository';
import OwnerMissingError from '../errors/ownerMissingError';
import housingRepository from '../repositories/housingRepository';
import HousingMissingError from '../errors/housingMissingError';
import { AuthenticatedRequest } from 'express-jwt';

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

const createNoteValidators: ValidationChain[] = [
  body('title').optional().isString().notEmpty(),
  body('ownerId').optional().isUUID(),
  // TODO: validate more
  body('housingIds')
    .optional()
    .isArray()
    .withMessage('Must be an array')
    .custom(
      (value) =>
        Array.isArray(value) &&
        value.every((item: unknown): item is string => {
          return typeof item === 'string';
        })
    )
    .withMessage('All items must be strings'),
  body('content').isString().notEmpty(),
  body('contactKind').isString().notEmpty(),
];

const create = async (request: Request, response: Response): Promise<void> => {
  const body: NoteCreationDTO = request.body;
  const { userId } = (request as AuthenticatedRequest).auth;

  const noteApi: Omit<NoteApi, 'id'> = {
    title: body.title,
    content: body.content,
    contactKind: body.contactKind,
    createdAt: new Date(),
    createdBy: userId,
  };
  const inserted: (OwnerNoteApi | HousingNoteApi)[] = [];

  if (body.ownerId && !body.housingIds?.length) {
    // Owner note
    const owner = await ownerRepository.get(body.ownerId);
    if (!owner) {
      throw new OwnerMissingError(body.ownerId);
    }
    const ownerNote = { ...noteApi, id: uuid(), ownerId: body.ownerId };
    await noteRepository.insertOwnerNote(ownerNote);
    inserted.push(ownerNote);
  }

  if (body.housingIds?.length) {
    // Housing note(s)
    const housingList = await housingRepository.listByIds(body.housingIds);
    if (housingList.length !== body.housingIds.length) {
      const missing = body.housingIds.filter(
        (id: string) => !housingList.find((h) => h.id === id)
      );
      throw new HousingMissingError(...missing);
    }

    const housingNotes: HousingNoteApi[] = housingList.map((housing) => ({
      ...noteApi,
      id: uuid(),
      housingId: housing.id,
    }));
    await noteRepository.insertManyHousingNotes(housingNotes);
    inserted.push(...housingNotes);
  }
  response.status(constants.HTTP_STATUS_CREATED).json(inserted);
};

const noteController = {
  createNoteValidators,
  create,
  listByOwnerId,
  listByHousingId,
};

export default noteController;
