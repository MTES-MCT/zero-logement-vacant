import { Response } from 'express';
import { Request as JWTRequest } from 'express-jwt';
import { GeoSystems } from '../models/GeoSystemApi';
import shpjs, { FeatureCollectionWithFilename } from 'shpjs';
import { RequestUser } from '../models/UserApi';
import housingScopesGeomRepository from '../repositories/geoRepository';
import geoRepository from '../repositories/geoRepository';
import { body, param, validationResult } from 'express-validator';
import { constants } from 'http2';

const listGeoSystems = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('List geo systems')

    return Promise.resolve(response.status(constants.HTTP_STATUS_OK).json(GeoSystems));

}
const listGeoPerimeters = async (request: JWTRequest, response: Response): Promise<Response> => {

    const establishmentId = (<RequestUser>request.auth).establishmentId;

    console.log('List geo perimeters', establishmentId)

    return geoRepository.listGeoPerimeters(establishmentId)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));

}

const createGeoPerimeter = async (request: any, response: Response): Promise<Response> => {

    console.log('Create scope')

    const establishmentId = (<RequestUser>request.auth).establishmentId;
    const file = request.files.geoPerimeter;
    // const filename = file.name;

    console.log('Create scope', file)

    const geojson = await shpjs(file.data)

    console.log('geojson', geojson)
    console.log('geometry', (<FeatureCollectionWithFilename>geojson).features.map(_ => _.geometry))
    console.log('properties', (<FeatureCollectionWithFilename>geojson).features.map(_ => _.properties))

    await Promise.all((<FeatureCollectionWithFilename>geojson).features.map(feature =>
        housingScopesGeomRepository.insert(feature.geometry, establishmentId, feature.properties?.type ?? '', feature.properties?.nom ?? ''))
    )

    return response.sendStatus(constants.HTTP_STATUS_OK);

}


const deleteGeoPerimeterValidators = [
    param('geoPerimeterId').notEmpty().isUUID()
];

const deleteGeoPerimeter = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    const geoPerimeterId = request.params.geoPerimeterId;
    const establishmentId = (<RequestUser>request.auth).establishmentId;

    console.log('Delete geo perimeter', geoPerimeterId);

    const geoPerimeter = await geoRepository.get(geoPerimeterId);

    if (!geoPerimeter || geoPerimeter.establishmentId !== establishmentId) {
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    }

    return geoRepository.deleteGeoPerimeter(geoPerimeterId)
        .then(() => response.sendStatus(constants.HTTP_STATUS_OK));

}


const updateGeoPerimeterValidators = [
    param('geoPerimeterId').notEmpty().isUUID(),
    body('type').notEmpty().isString(),
    body('type').optional({ nullable: true }).isString()
];

const updateGeoPerimeter = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    const geoPerimeterId = request.params.geoPerimeterId;
    const establishmentId = (<RequestUser>request.auth).establishmentId;
    const type = request.body.type;
    const name = request.body.name;

    console.log('Update geo perimeter', geoPerimeterId, type, name);

    const geoPerimeter = await geoRepository.get(geoPerimeterId);

    if (!geoPerimeter || geoPerimeter.establishmentId !== establishmentId) {
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    }

    return geoRepository.update(geoPerimeterId, type, name)
        .then(() => response.sendStatus(constants.HTTP_STATUS_OK));

}

const geoController =  {
    listGeoSystems,
    createGeoPerimeter,
    listGeoPerimeters,
    deleteGeoPerimeterValidators,
    deleteGeoPerimeter,
    updateGeoPerimeterValidators,
    updateGeoPerimeter
};

export default geoController;
