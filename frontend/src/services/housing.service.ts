import config from '../utils/config';
import authService from './auth.service';
import {
  HousingFilters,
  HousingFiltersForTotalCount,
} from '../models/HousingFilters';
import { Housing, HousingSort, HousingUpdate } from '../models/Housing';
import {
  HousingPaginatedResult,
  PaginatedResult,
} from '../models/PaginatedResult';
import { initialHousingFilters } from '../store/reducers/housingReducer';
import { toTitleCase } from '../utils/stringUtils';
import { HousingStatus } from '../models/HousingState';
import { parseISO } from 'date-fns';
import { SortOptions, toQuery } from '../models/Sort';
import { AbortOptions, createHttpService, toJSON } from '../utils/fetchUtils';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { parseOwner } from './owner.service';
import { HousingCount } from '../models/HousingCount';

const http = createHttpService('housing');

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

interface FindOptions
  extends PaginationOptions,
    SortOptions<HousingSort>,
    AbortOptions {
  filters: HousingFilters;
}

const find = async (opts?: FindOptions): Promise<HousingPaginatedResult> => {
  const query =
    toQuery(opts?.sort).length > 0 ? `?sort=${toQuery(opts?.sort)}` : '';

  return http
    .fetch(`${config.apiEndpoint}/api/housing${query}`, {
      method: 'POST',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: opts?.filters,
        ...opts?.pagination,
      }),
      abortId: opts?.abortable ? 'list-housing' : undefined,
    })
    .then(toJSON)
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

const count = async (
  filters: HousingFilters | HousingFiltersForTotalCount
): Promise<HousingCount> => {
  const response = await http.post(`${config.apiEndpoint}/api/housing/count`, {
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters,
    }),
  });
  if (!response.ok) {
    console.log(response);
    throw new Error('Bad response');
  }

  const count = await response.json();
  return count;
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
    owner: h.owner?.id ? parseOwner(h.owner) : undefined,
    lastContact: h.lastContact ? parseISO(h.lastContact) : undefined,
  } as Housing);

const housingService = {
  getHousing,
  find,
  listByOwner,
  count,
  updateHousing,
  updateHousingList,
  quickSearchService,
};

export default housingService;
