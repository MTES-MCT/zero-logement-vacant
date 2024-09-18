import type { FeatureCollection, Point } from 'geojson';

import config from '../utils/config';
import { createHttpService } from '../utils/fetchUtils';
import { Address } from '../models/Address';

export type AddressSearchResult = Address & {
  banId: string;
  label: string;
};

const http = createHttpService('address', {
  authenticated: false,
  host: config.banEndpoint,
  json: true
});

const quickSearch = async (query: string): Promise<AddressSearchResult[]> => {
  const params = new URLSearchParams({ q: query });
  const response = await http.get(`/search?${params}`, {
    abortId: 'search-address'
  });
  const addresses: FeatureCollection<Point> = await response.json();
  return addresses.features.map((point): AddressSearchResult => {
    const [longitude, latitude] = point.geometry.coordinates;
    const properties = point.properties ?? {};
    return {
      banId: properties.id,
      label: properties.label,
      street: properties.street,
      houseNumber: properties.housenumber,
      postalCode: properties.postcode,
      city: properties.city,
      longitude: longitude,
      latitude: latitude,
      score: properties.score
    };
  });
};

const addressService = {
  quickSearch
};

export default addressService;
