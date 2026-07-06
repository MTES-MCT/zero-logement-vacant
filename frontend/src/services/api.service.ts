import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { Record } from 'effect';
import qs from 'qs';

import config from '../utils/config';
import authService from './auth.service';

const TAG_TYPE_VALUES = [
  'Account',
  'Building',
  'Campaign',
  'Datafoncier housing',
  'Document',
  'Draft',
  'Establishment',
  'Event',
  'GeoPerimeter',
  'Group',
  'Housing',
  'HousingByStatus',
  'HousingCountByStatus',
  'HousingEvent',
  'HousingOwner',
  'Locality',
  'Note',
  'Owner',
  'OwnerHousing',
  'Precision',
  'Prospect',
  'Stats',
  'SignupLink',
  'User'
] as const;
export type TagType = (typeof TAG_TYPE_VALUES)[number];

let isAuthV2Active = config.featureFlags.includes('auth-v2');

export function setAuthV2Active(isActive: boolean): void {
  isAuthV2Active = isActive;
}

export function prepareAuthHeaders(headers: Headers): Headers {
  if (isAuthV2Active) {
    return headers;
  }
  return authService.withAuthHeader(headers) ?? headers;
}

export const zlvApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiEndpoint,
    credentials: 'include',
    // Legacy JWT support during the auth-v2 transition window. Once the flag
    // is fully rolled out, `prepareHeaders` and the `authService` import can be
    // removed (see frontend plan Part B).
    prepareHeaders: prepareAuthHeaders,
    paramsSerializer: (query) =>
      qs.stringify(
        Record.map(query, (value) => {
          if (Array.isArray(value)) {
            return value.map((v) => (v === null ? 'null' : v));
          }
          return value;
        }),
        { arrayFormat: 'comma' }
      )
  }),
  tagTypes: TAG_TYPE_VALUES,
  endpoints: () => ({})
});
