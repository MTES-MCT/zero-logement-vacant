import { Response } from 'express';
import { Request as JWTRequest } from 'express-jwt';
import { RequestUser } from '../models/UserApi';
import { constants } from 'http2';
import localityRepository from '../repositories/localityRepository';
import { body, param } from 'express-validator';
import establishmentRepository from '../repositories/establishmentRepository';
import LocalityMissingError from '../errors/localityMissingError';

const listLocalities = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const establishmentId = (<RequestUser>request.auth).establishmentId;

  console.log('List localities', establishmentId);

  return localityRepository
    .listByEstablishmentId(establishmentId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const updateLocalityTaxValidators = [
  param('geoCode').notEmpty().isAlphanumeric().isLength({ min: 5, max: 5 }),
  body('taxRate').isNumeric().optional(),
];

const updateLocalityTax = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  const geoCode = request.params.geoCode;
  const establishmentId = (<RequestUser>request.auth).establishmentId;
  const taxRate = request.body.taxRate;

  console.log('Update locality tax', geoCode, taxRate);

  const establishment = await establishmentRepository.get(establishmentId);
  const locality = await localityRepository.get(geoCode);

  if (!locality) {
    throw new LocalityMissingError(geoCode);
  }

  if (
    !establishment?.geoCodes.includes(locality.geoCode) ||
    locality.taxZone !== 'C'
  ) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }

  return localityRepository
    .update({ ...locality, taxRate })
    .then(() => response.sendStatus(constants.HTTP_STATUS_OK));
};

const localityController = {
  listLocalities,
  updateLocalityTaxValidators,
  updateLocalityTax,
};

export default localityController;
