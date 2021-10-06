import config from '../utils/config';
import authService from './auth.service';
import { Owner } from '../models/Owner';
import { parseISO } from 'date-fns';
import { HousingFilters } from '../models/Housing';


const listCampaigns = async (filters?: HousingFilters, search?: string) => {

    return await fetch(`${config.apiEndpoint}/api/campaigns`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, search }),
    }).then(_ => _.json());
};

const campaignService = {
    listCampaigns,
};

export default campaignService;
