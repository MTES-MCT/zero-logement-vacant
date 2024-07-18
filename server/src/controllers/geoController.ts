import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import shpjs, { FeatureCollectionWithFilename } from 'shpjs';
import geoRepository from '~/repositories/geoRepository';
import { body, param } from 'express-validator';
import { constants } from 'http2';
import { isArrayOf, isUUID } from '~/utils/validators';
import { logger } from '~/infra/logger';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';

async function listGeoPerimeters(request: Request, response: Response) {
  const { auth, } = request as AuthenticatedRequest;

  logger.info('List geo perimeters', auth.establishmentId);

  const geoPerimeters = await geoRepository.find(auth.establishmentId);
  response.status(constants.HTTP_STATUS_OK).json(geoPerimeters);
}

async function createGeoPerimeter(
  // TODO: type this
  request: any,
  response: Response
) {
  const { establishmentId, userId, } = (request as AuthenticatedRequest).auth;
  const file = request.files.geoPerimeter;

  logger.info('Create geo perimeter', {
    establishment: establishmentId,
    name: file.name,
  });

  const geojson = await shpjs(file.data);

  await Promise.all(
    (<FeatureCollectionWithFilename>geojson).features.map((feature) =>
      geoRepository.insert(
        feature.geometry,
        establishmentId,
        feature.properties?.type ?? '',
        feature.properties?.nom ?? '',
        userId
      )
    )
  );

  response.status(constants.HTTP_STATUS_OK).send();
}

const deleteGeoPerimeterListValidators = [
  body('geoPerimeterIds')
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs')
];

async function deleteGeoPerimeterList(request: Request, response: Response) {
  const { auth, body, } = request as AuthenticatedRequest;

  logger.info('Delete geo perimeters', body.geoPerimeterIds);

  await geoRepository.removeMany(body.geoPerimeterIds, auth.establishmentId);

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
}

const updateGeoPerimeterValidators = [
  param('geoPerimeterId').notEmpty().isUUID(),
  body('kind').notEmpty().isString(),
  body('name').optional({ nullable: true, }).isString()
];

async function updateGeoPerimeter(request: Request, response: Response) {
  const geoPerimeterId = request.params.geoPerimeterId;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;
  const kind = request.body.kind;
  const name = request.body.name;

  logger.info('Update geo perimeter', { geoPerimeterId, kind, name, });

  const geoPerimeter = await geoRepository.get(geoPerimeterId);

  if (!geoPerimeter || geoPerimeter.establishmentId !== establishmentId) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }

  const updated: GeoPerimeterApi = {
    ...geoPerimeter,
    kind,
    name,
  };
  await geoRepository.update(updated);
  response.status(constants.HTTP_STATUS_OK).json(updated);
}

const geoController = {
  createGeoPerimeter,
  listGeoPerimeters,
  deleteGeoPerimeterListValidators,
  deleteGeoPerimeterList,
  updateGeoPerimeterValidators,
  updateGeoPerimeter,
};

export default geoController;
