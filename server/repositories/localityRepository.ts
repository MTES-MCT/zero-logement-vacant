import db from './db';
import { LocalityApi } from '../models/EstablishmentApi';
import { establishmentsTable, housingScopeGeometryTable } from './establishmentRepository';
import { housingTable } from './housingRepository';

export const localitiesTable = 'localities';

const listByEstablishmentId = async (establishmentId: string): Promise<LocalityApi[]> => {

    try {
        return db(localitiesTable)
            .joinRaw(`join ${establishmentsTable} as e on (${localitiesTable}.id = any(e.localities_id))`)
            .where('e.id', establishmentId)
            .then(_ => _.map(_ => parseLocalityApi(_)))
    } catch (err) {
        console.error('Listing localities failed', err);
        throw new Error('Listing localities failed');
    }
}

const listHousingScopes = async (geoCodes: string[]): Promise<{geom: boolean, scopes: string[]}> => {
    try {
        return db(housingScopeGeometryTable)
            .joinRaw(`join ${housingTable} on st_contains(geom, ST_SetSRID( ST_Point(${housingTable}.latitude, ${housingTable}.longitude), 4326))`)
            .whereIn(`${housingTable}.insee_code`, geoCodes)
            .distinct('type')
            .then(_ => ({
                geom: true,
                scopes: _.map(_ => _.type)
            }))
    } catch (err) {
        console.error('Listing housing scopes failed', err);
        throw new Error('Listing housing scopes failed');
    }
}

const parseLocalityApi = (result: any) => <LocalityApi>{
    id: result.id,
    geoCode: result.geo_code,
    name: result.name
}

export default {
    listByEstablishmentId,
    listHousingScopes
}
