import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import contactPointsRepository from '~/repositories/contactPointsRepository';
import { body, param, query } from 'express-validator';
import ContactPointMissingError from '~/errors/contactPointMissingError';
import validator from 'validator';
import { ContactPointApi, toContactPointDTO } from '~/models/ContactPointApi';
import { logger } from '~/infra/logger';

const listContactPointsValidators = [
  query('establishmentId').notEmpty().isUUID(),
];

function listContactPoints(publicOnly: boolean) {
  return async (request: Request, response: Response): Promise<void> => {
    const establishmentId = request.query.establishmentId as string;

    logger.info('List contact points for establishment', establishmentId);

    const contactPoints = await contactPointsRepository.find(
      establishmentId,
      publicOnly,
    );
    response
      .status(constants.HTTP_STATUS_OK)
      .json(contactPoints.map(toContactPointDTO));
  };
}

interface ContactPointBody {
  title: string;
  opening?: string;
  address?: string;
  geoCodes: string[];
  email?: string;
  phone?: string;
  notes?: string;
}

const createContactPointValidators = [
  body('title').isString().notEmpty(),
  body('opening').isString().optional(),
  body('address').isString().optional(),
  body('geoCodes')
    .notEmpty()
    .isArray()
    .custom((value) =>
      value.every((v: any) =>
        validator.matches(v, /^(0[1-9]|[1-9][ABab\d])\d{3}$/),
      ),
    ),
  body('email').isEmail().optional(),
  body('phone').isString().optional(),
  body('notes').isString().optional(),
];

async function createContactPoint(request: Request, response: Response) {
  const { establishmentId } = (request as AuthenticatedRequest).auth;
  const body = request.body as ContactPointBody;

  logger.info('Create contact point', {
    establishment: establishmentId,
    title: body.title,
  });

  const contactPoint: ContactPointApi = {
    ...body,
    id: uuidv4(),
    establishmentId,
  };
  await contactPointsRepository.insert(contactPoint);
  response
    .status(constants.HTTP_STATUS_CREATED)
    .json(toContactPointDTO(contactPoint));
}

const deleteContactPointValidators = [param('id').notEmpty().isUUID()];

async function deleteContactPoint(request: Request, response: Response) {
  const { auth, params } = request as AuthenticatedRequest;

  logger.info('Delete contact point', params.id);

  const contactPoint = await contactPointsRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!contactPoint) {
    throw new ContactPointMissingError(params.id);
  }

  await contactPointsRepository.remove(params.id);
  response.sendStatus(constants.HTTP_STATUS_NO_CONTENT);
}

const updateContactPointValidators = [
  param('id').notEmpty().isUUID(),
  ...createContactPointValidators,
];

async function updateContactPoint(request: Request, response: Response) {
  const { auth, params } = request as AuthenticatedRequest;
  const body = request.body as ContactPointBody;

  logger.info('Update contact point with id', params.id);

  const contactPoint = await contactPointsRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!contactPoint) {
    throw new ContactPointMissingError(params.id);
  }

  const updated: ContactPointApi = {
    ...body,
    establishmentId: auth.establishmentId,
    id: params.id,
  };
  await contactPointsRepository.update(updated);
  response.status(constants.HTTP_STATUS_OK).json(toContactPointDTO(updated));
}

export default {
  createContactPoint,
  listContactPointsValidators,
  listContactPoints,
  deleteContactPointValidators,
  deleteContactPoint,
  createContactPointValidators,
  updateContactPointValidators,
  updateContactPoint,
};
