import config from '../utils/config';
import authService from './auth.service';


const listCampaigns = async (search?: string) => {

    return await fetch(`${config.apiEndpoint}/api/campaigns`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ search }),
    }).then(_ => _.json());
};

const campaignService = {
    listCampaigns,
};

export default campaignService;
