import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import fp from 'lodash/fp';
import qs from 'qs';

import config from '../utils/config';
import authService from './auth.service';

export const zlvApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
    paramsSerializer: (query) =>
      qs.stringify(
        fp.mapValues((value) => {
          if (Array.isArray(value)) {
            return value.map((v) => (v === null ? 'null' : v));
          }
          return value;
        }, query),
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
