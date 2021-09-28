import config from '../utils/config';
import authService from './auth.service';
import { Housing, HousingFilters } from '../models/Housing';


const listHousing = async (filters?: HousingFilters[]) => {

    return await fetch(`${config.apiEndpoint}/api/housing`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
    })
        .then(response => {
            return response.json();
        })
        .then(_ => _.map((d: any) => ({
            id: d.id,
            address: [
                d.fields['ADRESSE1'],
                d.fields['ADRESSE2'],
                d.fields['ADRESSE3'],
                d.fields['ADRESSE4']
            ].filter(a => a !== undefined),
            owner: d.fields['Propriétaire'],
            tags: [d.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : '']
        } as Housing)))
};

const housingService = {
    listHousing
};

export default housingService;
