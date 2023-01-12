import { Response } from 'express';
import { Request as JWTRequest } from 'express-jwt';
import { RequestUser } from '../models/UserApi';
import { constants } from 'http2';
import contactPointsRepository from '../repositories/contactPointsRepository';
import { body, param } from 'express-validator';
import ContactPointMissingError from '../errors/contactPointMissingError';

const listContactPoints = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const establishmentId = (<RequestUser>request.auth).establishmentId;

  console.log('List contact points', establishmentId);

  return contactPointsRepository
    .listContactPoints(establishmentId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

interface ContactPointBody {
  title: string;
  opening?: string;
  address?: string;
  geoCode?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

const createContactPointValidators = [
  body('title').isString().notEmpty(),
  body('opening').isString().optional(),
  body('address').isString().optional(),
  body('geoCode').isString().optional(),
  body('email').isEmail().optional(),
  body('phone').isString().optional(),
  body('notes').isString().optional(),
];

const createContactPoint = async (
  request: any,
  response: Response
): Promise<Response> => {
  const establishmentId = (<RequestUser>request.auth).establishmentId;
  const body = request.body as ContactPointBody;

  console.log('Create contact point', establishmentId, body.title);

  return contactPointsRepository
    .insert({ establishmentId, ...body })
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const deleteContactPointValidators = [
  param('contactPointId').notEmpty().isUUID(),
];

const deleteContactPoint = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const contactPointId = request.params.contactPointId;
  const establishmentId = (<RequestUser>request.auth).establishmentId;

  console.log('Delete contact point', contactPointId);

  const contactPoint = await contactPointsRepository.get(contactPointId);

  if (!contactPoint) {
    throw new ContactPointMissingError(contactPointId);
  }

  if (contactPoint.establishmentId !== establishmentId) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }

  return contactPointsRepository
    .deleteContactPoint(contactPointId)
    .then(() => response.sendStatus(constants.HTTP_STATUS_OK));
};

const updateContactPointValidators = [
  param('contactPointId').notEmpty().isUUID(),
  ...createContactPointValidators,
];

const updateContactPoint = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const contactPointId = request.params.contactPointId;
  const establishmentId = (<RequestUser>request.auth).establishmentId;
  const body = request.body as ContactPointBody;

  console.log('Update contact point with id', contactPointId);

  const contactPoint = await contactPointsRepository.get(contactPointId);
  if (!contactPoint) {
    throw new ContactPointMissingError(contactPointId);
  }

  if (contactPoint.establishmentId !== establishmentId) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }

  return contactPointsRepository
    .update({
      id: contactPointId,
      establishmentId,
      ...body,
    })
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const geoController = {
  createContactPoint,
  listContactPoints,
  deleteContactPointValidators,
  deleteContactPoint,
  createContactPointValidators,
  updateContactPointValidators,
  updateContactPoint,
};

export default geoController;
