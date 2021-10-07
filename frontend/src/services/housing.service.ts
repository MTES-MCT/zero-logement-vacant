import config from '../utils/config';
import authService from './auth.service';
import { HousingFilters } from '../models/Housing';


const listHousing = async (filters?: HousingFilters, search?: string) => {

    return await fetch(`${config.apiEndpoint}/api/housing`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, search }),
    }).then(_ => _.json());
};

const listByOwner = async (ownerId: string) => {

    return await fetch(`${config.apiEndpoint}/api/housing/owner/${ownerId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    }).then(_ => _.json());
};

const listByCampaign = async (campaignId: string) => {

    return await fetch(`${config.apiEndpoint}/api/housing/campaign/${campaignId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    }).then(_ => _.json());
};

const housingService = {
    listHousing,
    listByOwner,
    listByCampaign
};

export default housingService;
