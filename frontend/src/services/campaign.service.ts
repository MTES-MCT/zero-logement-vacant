import config from '../utils/config';
import authService from './auth.service';


const listCampaigns = async (search?: string) => {

    return await fetch(`${config.apiEndpoint}/api/campaigns`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ search }),
    }).then(_ => _.json());
};

const createCampaign = async (name: string, housingIds: string[]) => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/new`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, housingIds }),
    }).then(_ => _.json());
};

const campaignService = {
    listCampaigns,
    createCampaign
};

export default campaignService;
