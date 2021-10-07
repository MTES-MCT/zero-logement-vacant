import config from '../utils/config';
import authService from './auth.service';
import { CampaignFilters } from '../models/Campaign';


const listCampaigns = async (filters?: CampaignFilters, search?: string) => {

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
