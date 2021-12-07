import db from './db';
import { LocalityApi } from '../models/EstablishmentApi';

export const localitiesTable = 'localities';

const listByEstablishmentId = async (establishmentId: number): Promise<LocalityApi[]> => {
    try {
        return db(localitiesTable)
            .where('establishment_id', establishmentId)
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
