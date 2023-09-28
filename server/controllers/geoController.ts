import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import shpjs, { FeatureCollectionWithFilename } from 'shpjs';
import geoRepository from '../repositories/geoRepository';
import { body, param } from 'express-validator';
import { constants } from 'http2';
import { isArrayOf, isUUID } from '../utils/validators';

const listGeoPerimeters = async (request: Request, response: Response) => {
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;

  console.log('List geo perimeters', establishmentId);

  const geoPerimeters = await geoRepository.find(establishmentId);
  response.status(constants.HTTP_STATUS_OK).json(geoPerimeters);
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

  return response.status(constants.HTTP_STATUS_OK).send();
};

const deleteGeoPerimeterListValidators = [
  body('geoPerimeterIds')
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs'),
];

const deleteGeoPerimeterList = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const geoPerimeterIds = request.body.geoPerimeterIds;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;

  console.log('Delete geo perimeters', geoPerimeterIds);

  return geoRepository
    .removeMany(geoPerimeterIds, establishmentId)
    .then(() => response.sendStatus(constants.HTTP_STATUS_NO_CONTENT));
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
    .update({
      ...geoPerimeter,
      kind,
      name,
    })
    .then(() => response.status(constants.HTTP_STATUS_OK).send());
};

const geoController = {
  createGeoPerimeter,
  listGeoPerimeters,
  deleteGeoPerimeterListValidators,
  deleteGeoPerimeterList,
  updateGeoPerimeterValidators,
  updateGeoPerimeter,
};

export default geoController;
