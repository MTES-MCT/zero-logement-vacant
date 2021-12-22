import config from '../utils/config';
import authService from './auth.service';
import { HousingFilters } from '../models/HousingFilters';
import { CampaignHousing, Housing } from '../models/Housing';
import { PaginatedResult } from '../models/PaginatedResult';
import ownerService from './owner.service';
import { initialFilters } from '../store/reducers/housingReducer';
import { toTitleCase } from '../utils/stringUtils';
import { CampaignHousingStatus } from '../models/CampaignHousingStatus';


const listHousing = async (filters: HousingFilters, page: number, perPage: number): Promise<PaginatedResult<Housing>> => {

    return await fetch(`${config.apiEndpoint}/api/housing`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, page, perPage }),
    })
        .then(_ => _.json())
        .then(result => ({
            ...result,
            entities: result.entities.map((e: any) => parseHousing(e))
        }));
};

const quickSearchService = (): {abort: () => void, fetch: (query: string) => Promise<PaginatedResult<Housing>>} => {

    const controller = new AbortController();
    const signal = controller.signal;

    return {
        abort: () => controller.abort(),
        fetch: (query: string) => fetch(`${config.apiEndpoint}/api/housing`, {
            method: 'POST',
            headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters: {...initialFilters, query}, page: 1, perPage: 20 }),
            signal
        })
            .then(_ => _.json())
            .then(result => ({
                ...result,
                entities: result.entities.map((e: any) => parseHousing(e))
            }))
    };
};

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

const updateCampaignHousing = async (campaignHousing: CampaignHousing): Promise<CampaignHousing> => {

    return await fetch(`${config.apiEndpoint}/api/housing/campaign`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignHousing),
    })
        .then(_ => _.json());
};

const listByOwner = async (ownerId: string): Promise<Housing[]> => {

    return await fetch(`${config.apiEndpoint}/api/housing/owner/${ownerId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
        .then(_ => _.map((h: any) => parseHousing(h)));
};

const parseHousing = (h: any): Housing => ({
    ...h,
    rawAddress: h.rawAddress.filter((_: string) => _).map((_: string) => toTitleCase(_)),
    owner: ownerService.parseOwner(h.owner)
} as Housing)

const housingService = {
    listHousing,
    listByCampaign,
    updateCampaignHousing,
    listByOwner,
    quickSearchService
};

export default housingService;
