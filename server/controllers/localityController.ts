import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import localityRepository from '../repositories/localityRepository';
import { body, param, query } from 'express-validator';
import establishmentRepository from '../repositories/establishmentRepository';
import LocalityMissingError from '../errors/localityMissingError';
import { LocalityApi, TaxKindsApi } from '../models/LocalityApi';
import { logger } from '../utils/logger';

const getLocalityValidators = [
  param('geoCode').notEmpty().isAlphanumeric().isLength({ min: 5, max: 5 }),
];

async function getLocality(request: Request, response: Response) {
  const geoCode = request.params.geoCode;

  logger.info('Get locality', { geoCode });

  const locality = await localityRepository.get(geoCode);
  if (!locality) {
    throw new LocalityMissingError(geoCode);
  }

  response.status(constants.HTTP_STATUS_OK).json(locality);
}

const listLocalitiesValidators = [query('establishmentId').notEmpty().isUUID()];

async function listLocalities(request: Request, response: Response) {
  const establishmentId = request.query.establishmentId as string;

  logger.info('List localities', establishmentId);

  const localities = await localityRepository.listByEstablishmentId(
    establishmentId
  );
  response.status(constants.HTTP_STATUS_OK).json(localities);
}

const updateLocalityTaxValidators = [
  param('geoCode').notEmpty().isAlphanumeric().isLength({ min: 5, max: 5 }),
  body('taxKind').isIn([TaxKindsApi.THLV, TaxKindsApi.None]),
  body('taxRate')
    .if(body('taxKind').equals(TaxKindsApi.THLV))
    .isNumeric()
    .notEmpty(),
  body('taxRate').if(body('taxKind').equals(TaxKindsApi.None)).not().exists(),
];

async function updateLocalityTax(request: Request, response: Response) {
  const geoCode = request.params.geoCode;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;
  const taxRate = request.body.taxRate;
  const taxKind = request.body.taxKind;

  logger.info('Update locality tax', {
    geoCode,
    taxRate,
  });

  const establishment = await establishmentRepository.get(establishmentId);
  const locality = await localityRepository.get(geoCode);

  if (!locality) {
    throw new LocalityMissingError(geoCode);
  }

  if (
    !establishment?.geoCodes.includes(locality.geoCode) ||
    locality.taxKind === TaxKindsApi.TLV
  ) {
    response.status(constants.HTTP_STATUS_UNAUTHORIZED).send();
    return;
  }

  const updated: LocalityApi = {
    ...locality,
    taxRate,
    taxKind,
  };
  await localityRepository.update(updated);
  response.status(constants.HTTP_STATUS_OK).json(updated);
}

const localityController = {
  getLocalityValidators,
  getLocality,
  listLocalitiesValidators,
  listLocalities,
  updateLocalityTaxValidators,
  updateLocalityTax,
};

export default localityController;
