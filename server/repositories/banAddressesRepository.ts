import { AddressApi, AddressKinds } from '../models/AddressApi';
import db from './db';

export const banAddressesTable = 'ban_addresses';

const listByRefIds = async (refIds: string[], addressKind: AddressKinds): Promise<AddressApi[]> => {
    try {
        return db(banAddressesTable)
            .whereIn('ref_id', refIds)
            .andWhere('address_kind', addressKind)
            .then(_ => _.map(_ => parseAddressApi(_)))
    } catch (err) {
        console.error('Listing addresses failed', err);
        throw new Error('Listing addresses failed');
    }
}

const upsertList = async (addresses: AddressApi[]): Promise<AddressApi[]> => {

    console.log('Upsert address list', addresses.length)

    try {
        return db(banAddressesTable)
            .insert(addresses
                .filter(_ => _.refId)
                .filter((value, index, self) => self.findIndex(_ => _.refId === value.refId) === index)
                .map(addressApi => ({
                    ...formatAddressApi(addressApi),
                    last_updated_at: new Date()
                }))
            )
            .onConflict(['ref_id', 'address_kind'])
            .merge(['house_number', 'street', 'postal_code', 'city', 'x', 'y', 'score'])
            .returning('*')
    } catch (err) {
        console.error('Upserting addresses failed', err, addresses.length);
        throw new Error('Upserting addresses failed');
    }
}

export const parseAddressApi = (result: any) => <AddressApi>{
    refId: result.ref_id,
    addressKind: result.address_kind,
    houseNumber: result.house_number,
    street: result.street,
    postalCode: result.postal_code,
    city: result.city,
    x: result.x,
    y: result.y,
    score: result.score
}

const escapeValue = (value?: string) => {
    return value ? value.replace(/'/g, '\'\'') : ''
}

const formatAddressApi = (addressApi: AddressApi) => ({
    ref_id: addressApi.refId,
    address_kind: addressApi.addressKind,
    house_number: addressApi.houseNumber ?? '',
    street: escapeValue(addressApi.street),
    postal_code: addressApi.postalCode,
    city: escapeValue(addressApi.city),
    x: addressApi.x,
    y: addressApi.y,
    score: addressApi.score
})

export default {
    listByRefIds,
    upsertList
}
