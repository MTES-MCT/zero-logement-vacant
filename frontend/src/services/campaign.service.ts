import config from '../utils/config';
import authService from './auth.service';
import { format, parse, parseISO } from 'date-fns';
import { Campaign, CampaignKinds, CampaignSteps, DraftCampaign, getCampaignKindLabel } from '../models/Campaign';
import { fr } from 'date-fns/locale';


const listCampaigns = async (): Promise<Campaign[]> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseCampaign(_)))
};

const getCampaign = async (campaignId: string): Promise<Campaign> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/${campaignId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(_ => _.json())
        .then((_: any) => parseCampaign(_))
};

const createCampaign = async (draftCampaign: DraftCampaign, allHousing: boolean, housingIds?: string[]): Promise<string> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/creation`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftCampaign, allHousing, housingIds }),
    })
        .then(_ => _.json());
};

const createCampaignReminder = async (campaign: Campaign, startMonth: string,  allHousing: boolean, housingIds?: string[]): Promise<string> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/${campaign.id}/reminder`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ startMonth, allHousing, housingIds }),
    })
        .then(_ => _.json());
};

const deleteCampaign = async (campaignId: string): Promise<void> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(() => {});
};

const validCampaignStep = async (campaignId: string, step: CampaignSteps, params?: {sendingDate?: Date}): Promise<Campaign> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, sendingDate: params?.sendingDate }),
    })
        .then(_ => _.json())
        .then(_ => parseCampaign(_));
};

const getExportURL = (campaignId: string) => {
    return `${config.apiEndpoint}/api/housing/campaign/${campaignId}/export?x-access-token=${authService.authHeader()?.['x-access-token']}`;
};

const parseCampaign = (c: any): Campaign => ({
    ...c,
    name: `C${c.campaignNumber} - 
        ${format(parse(c.startMonth, 'yyMM', new Date()), 'MMM yyyy', { locale: fr })} - 
        ${getCampaignKindLabel(c.kind)}${c.kind === CampaignKinds.Remind ? ' n°' + c.reminderNumber : ''}`,
    createdAt: c.createdAt ? parseISO(c.createdAt) : undefined,
    validatedAt: c.validatedAt ? parseISO(c.validatedAt) : undefined,
    sentAt: c.sentAt ? parseISO(c.sentAt) : undefined
} as Campaign)

const campaignService = {
    listCampaigns,
    getCampaign,
    createCampaign,
    createCampaignReminder,
    deleteCampaign,
    validCampaignStep,
    getExportURL
};

export default campaignService;
