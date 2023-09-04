import config from '../utils/config';
import { Establishment } from '../models/Establishment';
import {
  createHttpService,
  getURLSearchParams,
  normalizeUrlSegment,
} from '../utils/fetchUtils';

const http = createHttpService('establishment', {
  host: config.apiEndpoint,
  authenticated: true,
  json: true,
});

const listEstablishments = async (filters: any): Promise<Establishment[]> => {
  const params = getURLSearchParams({
    ...filters,
    name: filters.name ? normalizeUrlSegment(filters.name) : undefined,
  });
  const response = await http.get(`/api/establishments?${params}`);
  return response.json();
};

const quickSearch = async (query: string): Promise<Establishment[]> => {
  const params = new URLSearchParams({ query });
  const response = await http.get(`/api/establishments?${params}`, {
    abortId: 'search-establishment',
  });
  return response.json();
};

const establishmentService = {
  listEstablishments,
  quickSearch,
};

export default establishmentService;
