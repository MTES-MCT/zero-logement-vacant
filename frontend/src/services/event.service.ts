import { Event } from '../models/Event';
import { parseISO } from 'date-fns';
import { zlvApi } from './api.service';

export const eventApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findEventsByOwner: builder.query<Event[], string>({
      query: (ownerId) => `events/owner/${ownerId}`,
      providesTags: () => ['Event'],
      transformResponse: (response: any[]) =>
        response.map((_) => parseEvent(_)),
    }),
    findEventsByHousing: builder.query<Event[], string>({
      query: (housingId) => `events/housing/${housingId}`,
      providesTags: () => ['Event'],
      transformResponse: (response: any[]) =>
        response.map((_) => parseEvent(_)),
    }),
  }),
});

const parseEvent = (e: any): Event => ({
  ...e,
  createdAt: e.createdAt ? parseISO(e.createdAt) : undefined,
});

export const { useFindEventsByHousingQuery, useFindEventsByOwnerQuery } =
  eventApi;
