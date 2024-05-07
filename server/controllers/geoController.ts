import * as turf from '@turf/turf';
import async from 'async';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param } from 'express-validator';
import { constants } from 'http2';
import shpjs from 'shpjs';
import { v4 as uuidv4 } from 'uuid';

import geoRepository from '../repositories/geoRepository';
import { isArrayOf, isUUID } from '../utils/validators';
import { logger } from '../utils/logger';
import { GeoPerimeterApi } from '../models/GeoPerimeterApi';

async function listGeoPerimeters(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;

  logger.info('List geo perimeters', auth.establishmentId);

  const geoPerimeters = await geoRepository.find({
    filters: {
      establishmentId: auth.establishmentId,
    },
  });
  response.status(constants.HTTP_STATUS_OK).json(geoPerimeters);
}

async function createGeoPerimeter(
  // TODO: type this
  request: any,
  response: Response<GeoPerimeterApi>
) {
  const { auth } = request as AuthenticatedRequest;
  const file = request.files.geoPerimeter;

  logger.info('Create geo perimeter', {
    establishment: auth.establishmentId,
    name: file.name,
  });

  const geojson = await shpjs(file.data);
  if (Array.isArray(geojson)) {
    throw new Error(
      'There must be only one feature collection in the zip file'
    );
  }

  const perimeters = geojson.features.map<GeoPerimeterApi>((feature) => {
    return {
      id: uuidv4(),
      name: feature.properties?.nom ?? '',
      kind: feature.properties?.type ?? '',
      establishmentId: auth.establishmentId,
      geoJson: toMultiPolygon(feature.geometry),
    };
  });
  await async.forEach(perimeters, async (perimeter) => {
    await geoRepository.insert(perimeter.geoJson);
  });
  await geoRepository.insert(geometry);
  await Promise.all(
    geojson.features.map((feature) =>
      geoRepository.insert(
        feature.geometry,
        auth.establishmentId,
        feature.properties?.type ?? '',
        feature.properties?.nom ?? '',
        auth.userId
      )
    )
  );

  response.status(constants.HTTP_STATUS_CREATED).json();
}

const deleteGeoPerimeterListValidators = [
  body('geoPerimeterIds')
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs'),
];

async function deleteGeoPerimeterList(request: Request, response: Response) {
  const { auth, body } = request as AuthenticatedRequest;

  logger.info('Delete geo perimeters', body.geoPerimeterIds);

  await geoRepository.removeMany(body.geoPerimeterIds, auth.establishmentId);

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
}

const updateGeoPerimeterValidators = [
  param('geoPerimeterId').notEmpty().isUUID(),
  body('kind').notEmpty().isString(),
  body('name').optional({ nullable: true }).isString(),
];

async function updateGeoPerimeter(request: Request, response: Response) {
  const geoPerimeterId = request.params.geoPerimeterId;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;
  const kind = request.body.kind;
  const name = request.body.name;

  logger.info('Update geo perimeter', { geoPerimeterId, kind, name });

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

function toMultiPolygon(feature: turf.Feature): turf.MultiPolygon {
  return turf.polygonize(feature.geometry);
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
