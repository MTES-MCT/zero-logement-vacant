import config from '../utils/config';
import authService from './auth.service';
import { Locality, TaxKinds } from '../models/Locality';

const getLocality = async (localityId: string): Promise<Locality> => {
  return await fetch(`${config.apiEndpoint}/api/localities/${localityId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((_) => _.json());
};

const listLocalities = async (): Promise<Locality> => {
  return await fetch(`${config.apiEndpoint}/api/localities`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  }).then((_) => _.json());
};

const updateLocalityTax = async (
  geoCode: string,
  taxKind: TaxKinds,
  taxRate?: number
): Promise<void> => {
  return await fetch(`${config.apiEndpoint}/api/localities/${geoCode}/tax`, {
    method: 'PUT',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ taxKind, taxRate }),
  }).then(() => {});
};

const localityService = {
  getLocality,
  listLocalities,
  updateLocalityTax,
};

export default localityService;
