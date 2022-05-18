import db from './db';
import { OwnerApi } from '../models/OwnerApi';
import { AddressApi } from '../models/AddressApi';
import { HousingApi } from '../models/HousingApi';

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


const updateAddressList = async (ownerAdresses: {addressId: string, addressApi: AddressApi}[]): Promise<HousingApi[]> => {
    try {
        if (ownerAdresses.filter(oa => oa.addressId).length) {
            const update = 'UPDATE owners as o SET ' +
                'postal_code = c.postal_code, house_number = c.house_number, street = c.street, city = c.city ' +
                'FROM (values' +
                ownerAdresses
                    .filter(oa => oa.addressId)
                    .map(ha => `('${ha.addressId}', '${ha.addressApi.postalCode}', '${ha.addressApi.houseNumber ?? ''}', '${escapeValue(ha.addressApi.street)}', '${escapeValue(ha.addressApi.city)}')`)
                +
                ') as c(id, postal_code, house_number, street, city)' +
                ' WHERE o.id::text = c.id'

            return db.raw(update);
        } else {
            return Promise.resolve([])
        }
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

const escapeValue = (value?: string) => {
    return value ? value.replace(/'/g, '\'\'') : ''
}

export const parseOwnerApi = (result: any) => <OwnerApi>{
    id: result.id,
    rawAddress: result.raw_address.filter((_: string) => _ && _.length),
    address: <AddressApi>{
        houseNumber: result.house_number,
        street: result.street,
        postalCode: result.postal_code,
        city: result.city
    },
    fullName: result.full_name,
    administrator: result.administrator,
    birthDate: result.birth_date,
    email: result.email,
    phone: result.phone
}

export default {
    get,
    update,
    updateAddressList
}
