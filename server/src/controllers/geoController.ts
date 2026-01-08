import * as turf from '@turf/turf';
import AdmZip from 'adm-zip';
import async from 'async';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param } from 'express-validator';
import { Feature, FeatureCollection, Geometry, MultiPolygon } from 'geojson';
import { constants } from 'http2';
import shapefile from 'shapefile';
import { v4 as uuidv4 } from 'uuid';
import { match, Pattern } from 'ts-pattern';

import geoRepository from '~/repositories/geoRepository';
import { isArrayOf, isUUID } from '~/utils/validators';
import { logger } from '~/infra/logger';
import { GeoPerimeterApi, toGeoPerimeterDTO } from '~/models/GeoPerimeterApi';

/**
 * Parse a shapefile from a ZIP buffer using the shapefile library.
 * This correctly handles Null Shapes (type 0) which shpjs cannot parse.
 */
async function parseShapefileFromZip(
  fileBuffer: Buffer
): Promise<FeatureCollection> {
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  const shpEntry = zipEntries.find((entry) =>
    entry.entryName.toLowerCase().endsWith('.shp')
  );
  const dbfEntry = zipEntries.find((entry) =>
    entry.entryName.toLowerCase().endsWith('.dbf')
  );

  if (!shpEntry || !dbfEntry) {
    throw new Error('Missing required shapefile components (.shp and .dbf)');
  }

  const shpBuffer = shpEntry.getData();
  const dbfBuffer = dbfEntry.getData();

  const features: Feature[] = [];
  const source = await shapefile.open(shpBuffer, dbfBuffer);

  let result = await source.read();
  while (!result.done) {
    const feature = result.value;
    // Filter out Null Shapes (features with null geometry)
    if (feature.geometry !== null) {
      features.push(feature as Feature);
    }
    result = await source.read();
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

async function listGeoPerimeters(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;

  logger.info('List geo perimeters', auth.establishmentId);

  const geoPerimeters = await geoRepository.find(auth.establishmentId);
  response.status(constants.HTTP_STATUS_OK).json(geoPerimeters);
}

async function createGeoPerimeter(
  request: Request,
  response: Response
) {
  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;
  const file = request.file;

  if (!file) {
    return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({
      error: 'No file uploaded',
      message: 'Please upload a shapefile as a ZIP file'
    });
  }

  logger.info('Create geo perimeter', {
    establishment: establishmentId,
    name: file.originalname
  });

  const featureCollection = await parseShapefileFromZip(file.buffer);
  const features = featureCollection.features;
  const perimeters = await async.map(features, async (feature: Feature) => {
    // TODO: ask if it necessary to create one perimeter by feature
    const multiPolygon: MultiPolygon = to2D(toMultiPolygon(feature.geometry));
    const perimeter: GeoPerimeterApi = {
      id: uuidv4(),
      kind: feature.properties?.type ?? '',
      name: feature.properties?.nom ?? '',
      geometry: multiPolygon,
      establishmentId,
      createdAt: new Date().toJSON(),
      createdBy: userId
    };
    await geoRepository.save(perimeter);
    return perimeter;
  });

  response
    .status(constants.HTTP_STATUS_OK)
    .json(perimeters.map(toGeoPerimeterDTO));
}

// TODO: export this to the `utils` package
export function toMultiPolygon(geometry: Geometry): MultiPolygon {
  return match(geometry)
    .with({ type: 'MultiPolygon' }, (multiPolygon) => multiPolygon)
    .with({ type: 'Polygon' }, (polygon) => {
      return turf.multiPolygon([polygon.coordinates]).geometry;
    })
    .with(
      { type: Pattern.union('LineString', 'MultiLineString') },
      (lineString) => {
        const polygons = turf
          .polygonize(lineString)
          .features.map(turf.getGeom)
          .map((polygon) => polygon.coordinates);
        return turf.multiPolygon(polygons).geometry;
      }
    )
    .otherwise((geometry) => {
      throw new Error(`${geometry.type} is not supported`);
    });
}

export function to2D(multiPolygon: MultiPolygon): MultiPolygon {
  const polygons = multiPolygon.coordinates.map((polygons) => {
    return polygons.map((polygon) => {
      return polygon.map((position) => position.slice(0, 2));
    });
  });
  return turf.multiPolygon(polygons).geometry;
}

const deleteGeoPerimeterListValidators = [
  body('geoPerimeterIds')
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs')
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
  body('name').optional({ nullable: true }).isString()
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
    name
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
  updateGeoPerimeter
};

export default geoController;
