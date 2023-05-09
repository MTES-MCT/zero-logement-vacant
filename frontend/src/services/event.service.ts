import config from '../utils/config';
import authService from './auth.service';
import { Event } from '../models/Event';
import { parseISO } from 'date-fns';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

export const eventApi = createApi({
  reducerPath: 'eventApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/events`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Event'],
  endpoints: (builder) => ({
    findEventsByOwner: builder.query<Event[], string>({
      query: (ownerId) => `/owner/${ownerId}`,
      providesTags: () => ['Event'],
      transformResponse: (response: any[]) =>
        response.map((_) => parseEvent(_)),
    }),
    findEventsByHousing: builder.query<Event[], string>({
      query: (housingId) => `/housing/${housingId}`,
      providesTags: () => ['Event'],
      transformResponse: (response: any[]) =>
        response.map((_) => parseEvent(_)),
    }),
  }),
});

const parseEvent = (e: any): Event =>
  ({
    id: e.id,
    ownerId: e.ownerId,
    housingId: e.housingId,
    campaignId: e.campaignId,
    kind: e.kind,
    createdAt: e.createdAt ? parseISO(e.createdAt) : undefined,
    createdBy: e.createdBy,
    title: e.title,
    content: e.content,
    contactKind: e.contactKind,
  } as Event);

export const { useFindEventsByHousingQuery, useFindEventsByOwnerQuery } =
  eventApi;
