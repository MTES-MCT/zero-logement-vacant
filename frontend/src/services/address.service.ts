import config from '../utils/config';
import { createHttpService, toJSON } from '../utils/fetchUtils';
import { Feature } from 'maplibre-gl';

export interface AddressSearchResult {
  label: string;
  geoCode: string;
  city: string;
}

const http = createHttpService('address');

const quickSearch = (query: string): Promise<AddressSearchResult[]> => {
  return http
    .fetch(
      {
        host: `${config.banEndpoint}/search`,
        searchParams: new URLSearchParams({ q: query }),
      },
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        abortId: 'search-address',
      }
    )
    .then(toJSON)
    .then((result) =>
      result.features.map(
        (a: Feature): AddressSearchResult => ({
          label: a.properties.label,
          geoCode: a.properties.citycode,
          city: a.properties.city,
        })
      )
    );
};

const addressService = {
  quickSearch,
};

export default addressService;
