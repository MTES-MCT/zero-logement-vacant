import config from '../utils/config';
import authService from './auth.service';
import { Housing } from '../models/Housing';


const listHousing = async () => {

    return await fetch(`${config.apiEndpoint}/api/housing`, {
        headers: { ...authService.authHeader() }
    })
        .then(response => {
            return response.json();
        })
        .then(_ => _.map((d: any) => <Housing>{
            address: d.fields['Adresse'],
            owner: d.fields['Propriétaire']
        }))
};

const housingService = {
    listHousing
};

export default housingService;
