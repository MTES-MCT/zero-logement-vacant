import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';

import eventRepository from '../repositories/eventRepository';
import { constants } from 'http2';
import { v4 as uuid } from 'uuid';
import { EventApi, EventKinds } from '../models/EventApi';
import { body, ValidationChain } from 'express-validator';
import { EventCreationDTO } from '../../shared/models/EventDTO';
import ownerRepository from '../repositories/ownerRepository';
import OwnerMissingError from '../errors/ownerMissingError';
import housingRepository from '../repositories/housingRepository';
import HousingMissingError from '../errors/housingMissingError';

const listByOwnerId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;

  console.log('List events for owner', ownerId);

  return eventRepository
    .listByOwnerId(ownerId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const listByHousingId = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const housingId = request.params.housingId;

  console.log('List events for housing', housingId);

  return eventRepository
    .listByHousingId(housingId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const createEventValidators: ValidationChain[] = [
  body('title').optional().isString().notEmpty(),
  body('ownerId').optional().isUUID(),
  // TODO: validate more
  body('housingId')
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

const create = async (
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body: EventCreationDTO = request.body;

    const events: EventApi[] = [];
    if (body.ownerId && !body.housingId?.length) {
      // Owner event
      const owner = await ownerRepository.get(body.ownerId);
      if (!owner) {
        throw new OwnerMissingError(body.ownerId);
      }
      events.push({
        id: uuid(),
        title: body.title,
        content: body.content,
        contactKind: body.contactKind,
        ownerId: body.ownerId,
        createdAt: new Date(),
        createdBy: request.auth?.userId,
        kind: EventKinds.NoteCreation,
      });
    }

    if (body.housingId?.length) {
      // Housing event(s)
      const housingList = await housingRepository.listByIds(body.housingId);
      if (housingList.length !== body.housingId.length) {
        const missing = body.housingId.filter(
          (id) => !housingList.find((h) => h.id === id)
        );
        throw new HousingMissingError(...missing);
      }
      const housingEvents: EventApi[] = body.housingId.map((hid) => ({
        id: uuid(),
        title: body.title,
        content: body.content,
        contactKind: body.contactKind,
        ownerId: body.ownerId,
        housingId: hid,
        createdAt: new Date(),
        createdBy: request.auth?.userId,
        kind: EventKinds.NoteCreation,
      }));
      events.push(...housingEvents);
    }

    const inserted = await eventRepository.insertList(events);
    response.status(constants.HTTP_STATUS_CREATED).json(inserted);
  } catch (error) {
    next(error);
  }
};

const eventController = {
  eventValidator: createEventValidators,
  create,
  listByOwnerId,
  listByHousingId,
};

export default eventController;
