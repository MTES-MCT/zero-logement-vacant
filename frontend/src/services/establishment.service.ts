import config from '../utils/config';
import authService from './auth.service';
import { Establishment } from '../models/Establishment';
import { EstablishmentFilterApi } from '../../../server/models/EstablishmentFilterApi';
import {
  createHttpService,
  getURLSearchParams,
  toJSON,
} from '../utils/fetchUtils';

const http = createHttpService('establishment');

const listEstablishments = async (
  filters: EstablishmentFilterApi
): Promise<Establishment[]> => {
  return await http
    .fetch(
      {
        host: `${config.apiEndpoint}/api/establishments`,
        searchParams: getURLSearchParams(filters),
      },
      {
        method: 'GET',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
      }
    )
    .then(toJSON);
};

const quickSearch = (query: string): Promise<Establishment[]> => {
  return http
    .fetch(
      {
        host: `${config.apiEndpoint}/api/establishments`,
        searchParams: new URLSearchParams({ query }),
      },
      {
        method: 'GET',
        abortId: 'search-establishment',
      }
    )
    .then(toJSON);
};

const establishmentService = {
  listEstablishments,
  quickSearch,
};

export default establishmentService;
