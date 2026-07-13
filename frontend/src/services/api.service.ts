import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { Record } from 'effect';
import qs from 'qs';

import config from '../utils/config';
import { createSessionAwareBaseQuery } from './session-aware-base-query';

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

const baseQuery = createSessionAwareBaseQuery(
  fetchBaseQuery({
    baseUrl: config.apiEndpoint,
    credentials: 'include',
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
  })
);

export const zlvApi = createApi({
  baseQuery,
  tagTypes: TAG_TYPE_VALUES,
  endpoints: () => ({})
});
