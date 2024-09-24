import type { FeatureCollection, Point } from 'geojson';

import config from '../utils/config';
import { createHttpService } from '../utils/fetchUtils';

export interface AddressSearchResult {
  banId: string;
  label: string;
  houseNumber?: string;
  street?: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
  score: number;
}

const http = createHttpService('address', {
  authenticated: false,
  host: config.banEndpoint,
  json: true
});

async function quickSearch(query: string): Promise<AddressSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await http.get(`/search?${params}`);
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
}

const addressService = {
  quickSearch
};

export default addressService;
