import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { Record } from 'effect';
import qs from 'qs';

import config from '../utils/config';
import authService from './auth.service';

export const zlvApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
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
  tagTypes: [
    'Account',
    'Building',
    'Campaign',
    'ContactPoint',
    'Datafoncier housing',
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
    'OwnerProspect',
    'Precision',
    'Prospect',
    'Settings',
    'Stats',
    'SignupLink',
    'User'
  ],
  endpoints: () => ({})
});
