import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import contactPointsRepository from '../repositories/contactPointsRepository';
import { body, param, query } from 'express-validator';
import ContactPointMissingError from '../errors/contactPointMissingError';
import validator from 'validator';
import { ContactPointApi, toContactPointDTO } from '../models/ContactPointApi';

const listContactPointsValidators = [
  query('establishmentId').notEmpty().isUUID(),
];

const listContactPoints = async (
  request: Request,
  response: Response
): Promise<void> => {
  const { auth, user } = request as AuthenticatedRequest;
  const establishmentId =
    auth?.establishmentId ?? request.query.establishmentId as string;

  console.log(
    'List contact points %s with role %s',
    establishmentId,
    user?.role
  );

  const contactPoints = await contactPointsRepository.find(establishmentId, user?.role);
  response
    .status(constants.HTTP_STATUS_OK)
    .json(contactPoints.map(toContactPointDTO));
};

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
        validator.matches(v, /^(0[1-9]|[1-9][ABab\d])\d{3}$/)
      )
    ),
  body('email').isEmail().optional(),
  body('phone').isString().optional(),
  body('notes').isString().optional(),
];

const createContactPoint = async (request: Request, response: Response) => {
  const { establishmentId } = (request as AuthenticatedRequest).auth;
  const body = request.body as ContactPointBody;

  console.log('Create contact point', establishmentId, body.title);

  const contactPoint: ContactPointApi = {
    ...body,
    id: uuidv4(),
    establishmentId,
  };
  await contactPointsRepository.insert(contactPoint);
  response
    .status(constants.HTTP_STATUS_OK)
    .json(toContactPointDTO(contactPoint));
};

const deleteContactPointValidators = [
  param('contactPointId').notEmpty().isUUID(),
];

const deleteContactPoint = async (request: Request, response: Response) => {
  const id = request.params.contactPointId;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  console.log('Delete contact point', id);

  const contactPoint = await contactPointsRepository.findOne({
    id,
    establishmentId,
  });
  if (!contactPoint) {
    throw new ContactPointMissingError(id);
  }

  await contactPointsRepository.remove(id);
  response.sendStatus(constants.HTTP_STATUS_NO_CONTENT);
};

const updateContactPointValidators = [
  param('contactPointId').notEmpty().isUUID(),
  ...createContactPointValidators,
];

const updateContactPoint = async (request: Request, response: Response) => {
  const contactPointId = request.params.contactPointId;
  const { establishmentId } = (request as AuthenticatedRequest).auth;
  const body = request.body as ContactPointBody;

  console.log('Update contact point with id', contactPointId);

  const contactPoint = await contactPointsRepository.findOne({
    id: contactPointId,
    establishmentId,
  });
  if (!contactPoint) {
    throw new ContactPointMissingError(contactPointId);
  }

  const updated: ContactPointApi = {
    ...body,
    establishmentId,
    id: contactPointId,
  };
  await contactPointsRepository.update(updated);
  response.status(constants.HTTP_STATUS_OK).json(toContactPointDTO(updated));
};

const geoController = {
  createContactPoint,
  listContactPointsValidators,
  listContactPoints,
  deleteContactPointValidators,
  deleteContactPoint,
  createContactPointValidators,
  updateContactPointValidators,
  updateContactPoint,
};

export default geoController;
