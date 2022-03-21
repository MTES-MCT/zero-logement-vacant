import config from '../utils/config';
import authService from './auth.service';
import { format, parse, parseISO } from 'date-fns';
import {
    Campaign,
    CampaignBundle,
    CampaignBundleId,
    campaignBundleIdApiFragment,
    campaignName,
    CampaignSteps,
    DraftCampaign,
} from '../models/Campaign';
import { fr } from 'date-fns/locale';
import { HousingStatus } from '../models/HousingState';
import { Housing } from '../models/Housing';

const listCampaigns = async (): Promise<Campaign[]> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseCampaign(_)))
};

const listCampaignBundles = async (): Promise<CampaignBundle[]> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/bundles`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(_ => _.json())
        .then(_ => _.map((_: any) => parseCampaignBundle(_)))
};

const getCampaignBundle = async (campaignBundleId: CampaignBundleId): Promise<CampaignBundle> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/bundles/${campaignBundleIdApiFragment(campaignBundleId)}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(_ => _.json())
        .then((_: any) => parseCampaignBundle(_))
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

const createCampaignBundleReminder = async (campaignBundleId: CampaignBundleId, startMonth: string,  allHousing: boolean, housingIds?: string[]): Promise<Campaign> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/bundles/${campaignBundleIdApiFragment(campaignBundleId)}`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ startMonth, allHousing, housingIds }),
    })
        .then(_ => _.json())
        .then(_ => parseCampaign(_));
};

const deleteCampaignBundle = async (campaignNumber: number): Promise<void> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/bundles/${campaignNumber}`, {
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

const removeHousingList = async (campaignId: string, allHousing: boolean, housingIds: string[], status: HousingStatus): Promise<Housing> => {

    return await fetch(`${config.apiEndpoint}/api/campaigns/${campaignId}/housing`, {
        method: 'DELETE',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ allHousing, housingIds, status }),
    })
        .then(_ => _.json());
};

const getExportURL = (campaignBundleId: CampaignBundleId) => {
    return `${config.apiEndpoint}/api/housing/campaigns/bundles/${campaignBundleIdApiFragment(campaignBundleId)}/export?x-access-token=${authService.authHeader()?.['x-access-token']}`;
};

const parseCampaign = (c: any): Campaign => ({
    ...c,
    name: campaignName(c.kind, c.startMonth, c.campaignNumber, c.reminderNumber),
    createdAt: c.createdAt ? parseISO(c.createdAt) : undefined,
    validatedAt: c.validatedAt ? parseISO(c.validatedAt) : undefined,
    sentAt: c.sentAt ? parseISO(c.sentAt) : undefined
} as Campaign)

const parseCampaignBundle = (c: any): CampaignBundle => ({
    ...c,
    name: c.campaignNumber ?
        `C${c.campaignNumber} - ${format(parse(c.startMonth, 'yyMM', new Date()), 'MMM yyyy', { locale: fr })}` :
        'Logements hors campagne'

} as CampaignBundle)

const campaignService = {
    listCampaigns,
    listCampaignBundles,
    getCampaignBundle,
    createCampaign,
    createCampaignBundleReminder,
    deleteCampaignBundle,
    validCampaignStep,
    removeHousingList,
    getExportURL
};

export default campaignService;
