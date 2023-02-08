import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import shpjs, { FeatureCollectionWithFilename } from 'shpjs';
import geoRepository from '../repositories/geoRepository';
import { body, param } from 'express-validator';
import { constants } from 'http2';

const listGeoPerimeters = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;

  console.log('List geo perimeters', establishmentId);

  return geoRepository
    .listGeoPerimeters(establishmentId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const createGeoPerimeter = async (
  // TODO: type this
  request: any,
  response: Response
): Promise<Response> => {
  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;
  const file = request.files.geoPerimeter;

  console.log('Create geo perimeter', establishmentId, file.name);

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

  return response.sendStatus(constants.HTTP_STATUS_OK);
};

const deleteGeoPerimeterValidators = [
  param('geoPerimeterId').notEmpty().isUUID(),
];

const deleteGeoPerimeter = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const geoPerimeterId = request.params.geoPerimeterId;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;

  console.log('Delete geo perimeter', geoPerimeterId);

  const geoPerimeter = await geoRepository.get(geoPerimeterId);

  if (!geoPerimeter || geoPerimeter.establishmentId !== establishmentId) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }

  return geoRepository
    .deleteGeoPerimeter(geoPerimeterId)
    .then(() => response.sendStatus(constants.HTTP_STATUS_OK));
};

const updateGeoPerimeterValidators = [
  param('geoPerimeterId').notEmpty().isUUID(),
  body('kind').notEmpty().isString(),
  body('name').optional({ nullable: true }).isString(),
];

const updateGeoPerimeter = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const geoPerimeterId = request.params.geoPerimeterId;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;
  const kind = request.body.kind;
  const name = request.body.name;

  console.log('Update geo perimeter', geoPerimeterId, kind, name);

  const geoPerimeter = await geoRepository.get(geoPerimeterId);

  if (!geoPerimeter || geoPerimeter.establishmentId !== establishmentId) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }

  return geoRepository
    .update(geoPerimeterId, kind, name)
    .then(() => response.sendStatus(constants.HTTP_STATUS_OK));
};

const geoController = {
  createGeoPerimeter,
  listGeoPerimeters,
  deleteGeoPerimeterValidators,
  deleteGeoPerimeter,
  updateGeoPerimeterValidators,
  updateGeoPerimeter,
};

export default geoController;
