import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import qs from 'qs';

import config from '../utils/config';
import authService from './auth.service';

export const zlvApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
    paramsSerializer: (query) => qs.stringify(query, { arrayFormat: 'comma' })
  }),
  tagTypes: [
    'Account',
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
    'HousingOwner',
    'Locality',
    'Note',
    'Owner',
    'OwnerProspect',
    'Settings',
    'Stats',
    'SignupLink',
    'User'
  ],
  endpoints: () => ({})
});
