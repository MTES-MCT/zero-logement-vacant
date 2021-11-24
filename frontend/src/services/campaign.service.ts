import config from '../utils/config';
import authService from './auth.service';
import { format, parse, parseISO } from 'date-fns';
import { Campaign, CampaignSteps, DraftCampaign } from '../models/Campaign';
import { fr } from "date-fns/locale";


const listCampaigns = async () => {

    return await fetch(`${config.apiEndpoint}/api/campaigns`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseCampaign(_)))
};

const createCampaign = async (draftCampaign: DraftCampaign, allHousing: boolean, housingIds?: string[]): Promise<Campaign> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/creation`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftCampaign, allHousing, housingIds }),
    })
        .then(_ => _.json())
        .then(_ => parseCampaign(_));
};

const validCampaignStep = async (campaignId: string, step: CampaignSteps): Promise<Campaign> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
    })
        .then(_ => _.json())
        .then(_ => parseCampaign(_));
};

const getExportURL = (campaignId: string) => {
    return `${config.apiEndpoint}/api/housing/campaign/${campaignId}/export?x-access-token=${authService.authHeader()?.['x-access-token']}`;
};

const parseCampaign = (c: any): Campaign => ({
    ...c,
    name: `C${c.campaignNumber} - ${format(parse(c.startMonth, 'yyMM', new Date()), 'MMM yyyy', { locale: fr })} - envoi initial`,
    createdAt: c.createdAt ? parseISO(c.createdAt) : undefined,
    validatedAt: c.validatedAt ? parseISO(c.validatedAt) : undefined,
    sentAt: c.sentAt ? parseISO(c.sentAt) : undefined
} as Campaign)

const campaignService = {
    listCampaigns,
    createCampaign,
    validCampaignStep,
    getExportURL
};

export default campaignService;
