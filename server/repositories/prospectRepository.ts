import db from './db';
import { ProspectApi } from '../models/ProspectApi';

export const prospectsTable = 'prospects';

const upsert = async (prospectApi: ProspectApi): Promise<ProspectApi> => {

    console.log('Upsert prospect with email', prospectApi.email)
    
    try {
        return db(prospectsTable)
            .insert({
                ...formatProspectApi(prospectApi),
                last_account_request_at: new Date()
            })
            .onConflict('email')
            .merge()
            .returning('*')
            .then(_ => parseProspectApi(_[0]))
    } catch (err) {
        console.error('Upserting prospect failed', err, prospectApi);
        throw new Error('Upserting prospect failed');
    }
}

const parseProspectApi = (result: any) => <ProspectApi>{
    email: result.email,
    hasAccount: result.has_account,
    hasCommitment: result.has_commitment,
    establishmentSiren: result.establishment_siren
}

const formatProspectApi = (prospectApi: ProspectApi) => ({
    email: prospectApi.email,
    has_account: prospectApi.hasAccount,
    has_commitment: prospectApi.hasCommitment,
    establishment_siren: prospectApi.establishmentSiren
})

export default {
    upsert,
    formatProspectApi,
    parseProspectApi
}
