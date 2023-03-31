import config from '../utils/config';
import { createHttpService } from '../utils/fetchUtils';
import { Feature } from 'maplibre-gl';

export interface AddressSearchResult {
  label: string;
  geoCode: string;
  city: string;
}

const http = createHttpService('address', {
  authenticated: false,
  host: config.banEndpoint,
  json: true,
});

const quickSearch = async (query: string): Promise<AddressSearchResult[]> => {
  const params = new URLSearchParams({ q: query });
  const response = await http.get(`/search?${params}`, {
    abortId: 'search-address',
  });
  const addresses = await response.json();
  return addresses.features.map(
    (a: Feature): AddressSearchResult => ({
      label: a.properties.label,
      geoCode: a.properties.citycode,
      city: a.properties.city,
    })
  );
};

const addressService = {
  quickSearch,
};

export default addressService;
