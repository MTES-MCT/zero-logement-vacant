import { body } from 'express-validator';
import { Response } from 'express';
import { constants } from 'http2';
import { Request as JWTRequest } from 'express-jwt';
import { OwnerProspectApi } from '../models/OwnerProspectApi';
import ownerProspectRepository from '../repositories/ownerProspectRepository';

const createOwnerProspectValidators = [
  body('email').isEmail().withMessage('Must be an email'),
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('address').isString().notEmpty(),
  body('geoCode').notEmpty().isAlphanumeric().isLength({ min: 5, max: 5 }),
  body('phone').isString().notEmpty(),
  body('notes').isString().optional(),
];

const createOwnerProspect = async (request: JWTRequest, response: Response) => {
  const ownerProspectApi = request.body as OwnerProspectApi;

  const createdOwnerProspect = await ownerProspectRepository.insert(
    ownerProspectApi
  );

  response.status(constants.HTTP_STATUS_CREATED).json(createdOwnerProspect);
};

export default {
  createOwnerProspectValidators,
  createOwnerProspect,
};
