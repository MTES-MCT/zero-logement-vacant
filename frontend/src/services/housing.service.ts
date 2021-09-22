import config from '../utils/config';
import authService from './auth.service';
import { Housing } from '../models/Housing';


const listHousing = async (ownerKinds?: string[]) => {

    return await fetch(`${config.apiEndpoint}/api/housing`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerKinds }),
    })
        .then(response => {
            return response.json();
        })
        .then(_ => _.map((d: any) => ({
            address: d.fields['Adresse'],
            owner: d.fields['Propriétaire']
        } as Housing)))
};

const housingService = {
    listHousing
};

export default housingService;
