import config from '../utils/config';
import authService from './auth.service';
import { CampaignHousing, CampaignHousingUpdate } from '../models/Housing';
import { PaginatedResult } from '../models/PaginatedResult';
import { CampaignHousingStatus } from '../models/CampaignHousingState';
import { parseHousing } from './housing.service';

const listByCampaign = async (campaignId: string, page: number, perPage: number, status: CampaignHousingStatus, excludedIds: string[] = []): Promise<PaginatedResult<CampaignHousing>> => {

    return await fetch(`${config.apiEndpoint}/api/campaign/${campaignId}/housing`, {
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

const listByOwner = async (ownerId: string): Promise<CampaignHousing[]> => {

    return await fetch(`${config.apiEndpoint}/api/campaign/housing/owner/${ownerId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
        .then(_ => _.json())
        .then(_ => (_.map((e: any) => parseHousing(e) as CampaignHousing)));
};

const updateCampaignHousingList = async (campaignId: string, campaignHousingUpdate: CampaignHousingUpdate, allHousing: boolean, housingIds: string[]): Promise<any> => {

    return await fetch(`${config.apiEndpoint}/api/campaign/housing`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, campaignHousingUpdate, allHousing, housingIds }),
    });
};

const removeCampaignHousingList = async (campaignId: string, allHousing: boolean, housingIds: string[], status: CampaignHousingStatus): Promise<CampaignHousing> => {

    return await fetch(`${config.apiEndpoint}/api/campaign/housing`, {
        method: 'DELETE',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, allHousing, housingIds, status }),
    })
        .then(_ => _.json());
};

const campaignHousingService = {
    listByCampaign,
    listByOwner,
    updateCampaignHousingList,
    removeCampaignHousingList
};

export default campaignHousingService;
