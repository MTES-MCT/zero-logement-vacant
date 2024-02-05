import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import config from '../utils/config';
import authService from './auth.service';

export const zlvApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: [
    'Account',
    'Campaign',
    'ContactPoint',
    'Datafoncier housing',
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
    'User',
  ],
  endpoints: (builder) => ({}),
});
