import { EventDTO } from '@zerologementvacant/models';

import { Event, fromEventDTO } from '../models/Event';
import { zlvApi } from './api.service';

export const eventApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findEventsByOwner: builder.query<Event[], string>({
      query: (id) => `/owners/${id}/events`,
      providesTags: (events) =>
        events
          ? events.map((event) => ({ type: 'Event' as const, id: event.id }))
          : ['Event'],
      transformResponse: (events: ReadonlyArray<EventDTO>) =>
        events.map(fromEventDTO)
    }),
    findEventsByHousing: builder.query<Event[], string>({
      query: (id) => `/housing/${id}/events`,
      providesTags: (events, _error, housingId) =>
        events
          ? [
              ...events.map((event) => ({
                type: 'Event' as const,
                id: event.id
              })),
              {
                type: 'HousingEvent' as const,
                id: housingId
              }
            ]
          : ['Event', 'HousingEvent'],
      transformResponse: (events: EventDTO[]) => events.map(fromEventDTO)
    })
  })
});

export const { useFindEventsByHousingQuery, useFindEventsByOwnerQuery } =
  eventApi;
