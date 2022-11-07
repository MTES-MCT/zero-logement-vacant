import fetch from 'node-fetch';
import config from '../utils/config';
import { ProspectApi } from '../models/ProspectApi';

const consultUser = async (email: string): Promise<ProspectApi> => {

    return fetch(`${config.cerema.api.endpoint}/api/consult/utilisateurs/?email=${email}`, {
        method: 'GET',
        headers: { 'Authorization': `Token ${config.cerema.api.authToken}`, 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
        .then(users => {
            if (users.length) {
                return <ProspectApi>{
                    email: users[0].email,
                    establishment: {
                        siren: users[0].siret.substring(0, 9),
                    },
                    hasAccount: true,
                    hasCommitment: users[0].lovac_ok
                }
            } else {
                return <ProspectApi>{
                    email,
                    hasAccount: false,
                    hasCommitment: false
                }
            }
        });
}

export default {
    consultUser
}
