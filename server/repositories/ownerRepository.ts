import db from './db';
import { OwnerApi } from '../models/OwnerApi';

export const ownerTable = 'owners';

const get = async (ownerId: string): Promise<OwnerApi> => {
    try {
        return db(ownerTable)
            .where('id', ownerId)
            .first()
            .then(_ => parseOwnerApi(_))
    } catch (err) {
        console.error('Getting owner failed', err, ownerId);
        throw new Error('Getting owner failed');
    }
}

const update = async (ownerApi: OwnerApi): Promise<OwnerApi> => {
    try {
        return db(ownerTable)
            .where('id', ownerApi.id)
            .update({
                raw_address: ownerApi.rawAddress,
                full_name: ownerApi.fullName,
                birth_date: ownerApi.birthDate ? new Date(ownerApi.birthDate) : undefined,
                email: ownerApi.email,
                phone: ownerApi.phone
            })
            .returning('*')
            .then(_ => _[0]);
    } catch (err) {
        console.error('Updating owner failed', err, ownerApi);
        throw new Error('Updating owner failed');
    }
}

export const parseOwnerApi = (result: any) => <OwnerApi>{
    id: result.id,
    rawAddress: result.raw_address.filter((_: string) => _ && _.length),
    fullName: result.full_name,
    birthDate: result.birth_date,
    email: result.email,
    phone: result.phone
}

export default {
    get,
    update
}
