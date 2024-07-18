import config from '../utils/config';
import { createHttpService } from '../utils/fetchUtils';
import { Feature } from 'maplibre-gl';
import { Address } from '../models/Address';

export type AddressSearchResult = Address & {
  label: string;
};

const http = createHttpService('address', {
  authenticated: false,
  host: config.banEndpoint,
  json: true,
});

const quickSearch = async (query: string): Promise<AddressSearchResult[]> => {
  const params = new URLSearchParams({ q: query, });
  const response = await http.get(`/search?${params}`, {
    abortId: 'search-address',
  });
  const addresses = await response.json();
  return addresses.features.map(
    (a: Feature): AddressSearchResult => ({
      label: a.properties.label,
      street: a.properties.street,
      houseNumber: a.properties.housenumber,
      postalCode: a.properties.postcode,
      city: a.properties.city,
      longitude: a.properties.x,
      latitude: a.properties.y,
      score: a.properties.score,
    })
  );
};

const addressService = {
  quickSearch,
};

export default addressService;
