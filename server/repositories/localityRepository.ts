import db from './db';
import { LocalityApi } from '../models/EstablishmentApi';
import { establishmentsTable } from './establishmentRepository';

export const localitiesTable = 'localities';

const listByEstablishmentId = async (establishmentId: string): Promise<LocalityApi[]> => {

    try {
        return db(localitiesTable)
            .joinRaw(`join ${establishmentsTable} as e on (${localitiesTable}.geo_code = any(e.localities_geo_code))`)
            .where('e.id', establishmentId)
            .then(_ => _.map(_ => parseLocalityApi(_)))
    } catch (err) {
        console.error('Listing localities failed', err);
        throw new Error('Listing localities failed');
    }
}

const parseLocalityApi = (result: any) => <LocalityApi>{
    id: result.id,
    geoCode: result.geo_code,
    name: result.name
}

export default {
    listByEstablishmentId
}
