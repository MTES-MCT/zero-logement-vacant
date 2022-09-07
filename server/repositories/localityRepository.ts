import db from './db';
import { LocalityApi } from '../models/EstablishmentApi';
import { establishmentsTable, housingScopeGeometryTable } from './establishmentRepository';

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

const listHousingScopes = async (establishmentId: string): Promise<string[]> => {
    try {
        return db(housingScopeGeometryTable)
            .leftJoin(establishmentsTable, 'establishment_id', `${establishmentsTable}.id`)
            .where('establishment_id', establishmentId)
            .orWhereNull('establishment_id')
            .distinct('type')
            .orderBy('type')
            .then(_ => _.map(_ => _.type))
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
