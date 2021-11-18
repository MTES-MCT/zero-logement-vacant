import db from './db';
import { HousingApi } from '../models/HousingApi';
import { AddressApi } from '../models/AddressApi';

export const housingTable = 'housing';


const list = async (): Promise<HousingApi[]> => {
    try {
        return db(housingTable)
            .then(_ => _.map(r => (<HousingApi>{
                id: r.id,
                rawAddress: r.raw_address,
                address: <AddressApi>{
                    houseNumber: r.house_number,
                    street: r.street,
                    postalCode: r.postal_code,
                    city: r.city
                }
            })))
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

const rawUpdate = async (update: string): Promise<HousingApi[]> => {
    try {
        return db.raw(update)
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

export default {
    list,
    rawUpdate
}
