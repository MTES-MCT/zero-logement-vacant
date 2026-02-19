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
  cityCode?: string;
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
  const trimmed = query.trim();
  // BAN API requires: 3-200 chars, starts with letter or number
  if (trimmed.length < 3 || !/^[a-zA-Z0-9]/.test(trimmed)) {
    return [];
  }
  const params = new URLSearchParams({ q: trimmed });
  const response = await http.get(`/search?${params}`, {
    cache: 'no-store'
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
      cityCode: properties.citycode,
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
