import db from './db';
import { OwnerApi } from '../models/OwnerApi';

export const ownerTable = 'owners';

const get = async (ownerId: string): Promise<OwnerApi> => {
    try {
        return db(ownerTable)
            .where('id', ownerId)
            .first()
            .then((result: any) => <OwnerApi>{
                id: result.id,
                rawAddress: result.raw_address,
                fullName: result.full_name,
                birthDate: result.birth_date,
                email: result.email,
                phone: result.phone
            })
    } catch (err) {
        console.error('Getting owner failed', err, ownerId);
        throw new Error('Getting owner failed');
    }
}

export default {
    get
}
