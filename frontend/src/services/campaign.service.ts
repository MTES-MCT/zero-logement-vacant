import config from '../utils/config';
import authService from './auth.service';
import { parseISO } from 'date-fns';
import { Campaign } from '../models/Campaign';


const listCampaigns = async (search?: string) => {

    return await fetch(`${config.apiEndpoint}/api/campaigns`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ search }),
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseCampaign(_)))
};

const createCampaign = async (name: string, housingIds: string[]): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/creation`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, housingIds }),
    })
        .then(_ => _.json())
        .then(_ => _.id);
};

const validCampaign = async (campaignId: string): Promise<Campaign> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/${campaignId}/validation`, {
        method: 'PUT',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
    })
        .then(_ => _.json())
        .then(_ => parseCampaign(_));
};

const getExportURL = (campaignId: string) => {
    return `${config.apiEndpoint}/api/housing/campaign/${campaignId}/export?x-access-token=${authService.authHeader()?.['x-access-token']}`;
};

const parseCampaign = (c: any): Campaign => ({
    id: c.id,
    name: c.name,
    validatedAt: c.validatedAt ? parseISO(c.validatedAt) : undefined,
    sentAt: c.sentAt ? parseISO(c.sentAt) : undefined
} as Campaign)

const campaignService = {
    listCampaigns,
    createCampaign,
    validCampaign,
    getExportURL
};

export default campaignService;
