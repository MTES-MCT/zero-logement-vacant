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

// Extract postal code from label if not in properties (e.g., for lieu-dits)
function extractPostalCodeFromLabel(label: string): string {
  const match = label.match(/\b((?:2[AB]|[0-9]{2})\d{3})\b/);
  return match?.[1] ?? '';
}

// Extract city from label (text after postal code) if not in properties
function extractCityFromLabel(label: string): string {
  const match = label.match(/\b(?:2[AB]|[0-9]{2})\d{3}\s+(.+?)$/);
  return match?.[1]?.trim() ?? '';
}

async function quickSearch(query: string): Promise<AddressSearchResult[]> {
  const trimmed = query.trim();
  // BAN API requires: 3-200 chars, starts with letter or number
  if (trimmed.length < 3 || !/^[a-zA-Z0-9]/.test(trimmed)) {
    return [];
  }
  const params = new URLSearchParams({ q: trimmed });
  const response = await http.get(`/search?${params}`);
  const addresses: FeatureCollection<Point> = await response.json();
  return addresses.features.map((point): AddressSearchResult => {
    const [longitude, latitude] = point.geometry.coordinates;
    const properties = point.properties ?? {};
    const label = properties.label ?? '';

    // Use properties if available, otherwise extract from label (for lieu-dits)
    const postalCode = properties.postcode || extractPostalCodeFromLabel(label);
    const city = properties.city || extractCityFromLabel(label);

    return {
      banId: properties.id,
      label,
      street: properties.street,
      houseNumber: properties.housenumber,
      postalCode,
      city,
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
