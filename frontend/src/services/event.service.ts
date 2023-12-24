import { Event } from '../models/Event';
import { parseISO } from 'date-fns';
import { zlvApi } from './api.service';

export const eventApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findEventsByOwner: builder.query<Event[], string>({
      query: (id) => `owner/${id}/events`,
      providesTags: () => ['Event'],
      transformResponse: (events: any[]) =>
        events.map(parseEvent),
    }),
    findEventsByHousing: builder.query<Event[], string>({
      query: (id) => `housing/${id}/events`,
      providesTags: () => ['Event'],
      transformResponse: (events: any[]) =>
        events.map(parseEvent),
    }),
  }),
});

const parseEvent = (e: any): Event => ({
  ...e,
  createdAt: e.createdAt ? parseISO(e.createdAt) : undefined,
});

export const { useFindEventsByHousingQuery, useFindEventsByOwnerQuery } =
  eventApi;
