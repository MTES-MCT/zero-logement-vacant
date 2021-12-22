import config from '../utils/config';
import authService from './auth.service';
import { CampaignHousing, CampaignHousingUpdate } from '../models/Housing';
import { PaginatedResult } from '../models/PaginatedResult';
import { CampaignHousingStatus } from '../models/CampaignHousingState';
import { parseHousing } from './housing.service';

const listByCampaign = async (campaignId: string, page: number, perPage: number, status: CampaignHousingStatus, excludedIds: string[] = []): Promise<PaginatedResult<CampaignHousing>> => {

    return await fetch(`${config.apiEndpoint}/api/housing/campaign/${campaignId}`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
            campaignId,
            page,
            perPage,
            status,
            excludedIds}),
    })
        .then(_ => _.json())
        .then(result => ({
            ...result,
            entities: result.entities.map((e: any) => parseHousing(e) as CampaignHousing)
        }));
};

const updateCampaignHousingList = async (campaignId: string, campaignHousingUpdate: CampaignHousingUpdate, allHousing: boolean, housingIds: string[]): Promise<CampaignHousing> => {

    return await fetch(`${config.apiEndpoint}/api/housing/campaign`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, campaignHousingUpdate, allHousing, housingIds }),
    })
        .then(_ => _.json());
};

const removeCampaignHousingList = async (campaignId: string, allHousing: boolean, housingIds: string[], status: CampaignHousingStatus): Promise<CampaignHousing> => {

    return await fetch(`${config.apiEndpoint}/api/housing/campaign`, {
        method: 'DELETE',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, allHousing, housingIds, status }),
    })
        .then(_ => _.json());
};

const campaignHousingService = {
    listByCampaign,
    updateCampaignHousingList,
    removeCampaignHousingList
};

export default campaignHousingService;
