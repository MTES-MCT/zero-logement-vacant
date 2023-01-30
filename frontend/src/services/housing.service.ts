import config from '../utils/config';
import authService from './auth.service';
import {
  HousingFilters,
  HousingFiltersForTotalCount,
} from '../models/HousingFilters';
import { Housing, HousingSort, HousingUpdate } from '../models/Housing';
import { PaginatedResult } from '../models/PaginatedResult';
import ownerService from './owner.service';
import { initialHousingFilters } from '../store/reducers/housingReducer';
import { toTitleCase } from '../utils/stringUtils';
import { HousingStatus } from '../models/HousingState';
import { parseISO } from 'date-fns';
import { toQuery } from '../models/Sort';

const getHousing = async (id: string): Promise<Housing> => {
  return await fetch(`${config.apiEndpoint}/api/housing/${id}`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.json())
    .then((_) => parseHousing(_));
};

const listHousing = async (
  filters: HousingFilters,
  filtersForTotalCount: HousingFiltersForTotalCount,
  page: number,
  perPage: number,
  sort?: HousingSort
): Promise<PaginatedResult<Housing>> => {
  const query = toQuery(sort).length > 0 ? `?sort=${toQuery(sort)}` : '';

  return await fetch(`${config.apiEndpoint}/api/housing${query}`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filters, filtersForTotalCount, page, perPage }),
  })
    .then((_) => _.json())
    .then((result) => ({
      ...result,
      entities: result.entities.map((e: any) => parseHousing(e)),
    }));
};

const quickSearchService = (): {
  abort: () => void;
  fetch: (query: string) => Promise<PaginatedResult<Housing>>;
} => {
  const controller = new AbortController();
  const signal = controller.signal;

  return {
    abort: () => controller.abort(),
    fetch: (query: string) =>
      fetch(`${config.apiEndpoint}/api/housing`, {
        method: 'POST',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: { ...initialHousingFilters, query },
          page: 1,
          perPage: 20,
        }),
        signal,
      })
        .then((_) => _.json())
        .then((result) => ({
          ...result,
          entities: result.entities.map((e: any) => parseHousing(e)),
        })),
  };
};

const listByOwner = async (
  ownerId: string
): Promise<{ entities: Housing[]; totalCount: number }> => {
  return await fetch(`${config.apiEndpoint}/api/housing/owner/${ownerId}`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  })
    .then((_) => _.json())
    .then((result) => ({
      ...result,
      entities: result.entities.map((e: any) => parseHousing(e)),
    }));
};

const updateHousing = async (
  housingId: string,
  housingUpdate: HousingUpdate
): Promise<any> => {
  return await fetch(`${config.apiEndpoint}/api/housing/${housingId}`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ housingUpdate }),
  });
};

const updateHousingList = async (
  housingUpdate: HousingUpdate,
  campaignIds: string[],
  allHousing: boolean,
  housingIds: string[],
  currentStatus?: HousingStatus,
  query?: string
): Promise<any> => {
  return await fetch(`${config.apiEndpoint}/api/housing/list`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      housingUpdate,
      campaignIds,
      allHousing,
      housingIds,
      currentStatus,
      query,
    }),
  });
};

export const parseHousing = (h: any): Housing =>
  ({
    ...h,
    rawAddress: h.rawAddress
      .filter((_: string) => _)
      .map((_: string) => toTitleCase(_)),
    owner: h.owner?.id ? ownerService.parseOwner(h.owner) : undefined,
    lastContact: h.lastContact ? parseISO(h.lastContact) : undefined,
  } as Housing);

const housingService = {
  getHousing,
  listHousing,
  listByOwner,
  updateHousing,
  updateHousingList,
  quickSearchService,
};

export default housingService;
