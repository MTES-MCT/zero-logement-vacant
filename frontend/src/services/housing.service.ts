import config from '../utils/config';
import authService from './auth.service';
import { HousingFilters } from '../models/HousingFilters';
import { Housing, HousingUpdate } from '../models/Housing';
import { PaginatedResult } from '../models/PaginatedResult';
import ownerService from './owner.service';
import { initialFilters } from '../store/reducers/housingReducer';
import { toTitleCase } from '../utils/stringUtils';
import { HousingStatus } from '../models/HousingState';


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

const exportHousing = async (filters: HousingFilters, allHousing: boolean, housingIds?: string[]): Promise<Blob> => {

    return await fetch(`${config.apiEndpoint}/api/housing/export`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, allHousing, housingIds }),
    })
        .then(_ => _.blob())

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

const listByOwner = async (ownerId: string): Promise<Housing[]> => {

    return await fetch(`${config.apiEndpoint}/api/housing/owner/${ownerId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
        .then(_ => _.map((h: any) => parseHousing(h)));
};

const updateHousingList = async (housingUpdate: HousingUpdate, campaignIds: string[],  allHousing: boolean, housingIds: string[], currentStatus?: HousingStatus): Promise<any> => {

    return await fetch(`${config.apiEndpoint}/api/housing/list`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ housingUpdate, campaignIds, allHousing, housingIds, currentStatus }),
    });
};

export const parseHousing = (h: any): Housing => ({
    ...h,
    rawAddress: h.rawAddress.filter((_: string) => _).map((_: string) => toTitleCase(_)),
    owner: ownerService.parseOwner(h.owner)
} as Housing)

const housingService = {
    listHousing,
    listByOwner,
    updateHousingList,
    quickSearchService,
    exportHousing
};

export default housingService;
