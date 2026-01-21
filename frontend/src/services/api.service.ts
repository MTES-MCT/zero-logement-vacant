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
  'Settings',
  'Stats',
  'SignupLink',
  'User'
] as const;
export type TagType = (typeof TAG_TYPE_VALUES)[number];

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
  tagTypes: TAG_TYPE_VALUES,
  endpoints: () => ({})
});
