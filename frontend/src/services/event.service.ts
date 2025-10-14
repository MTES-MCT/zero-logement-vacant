import type { EventDTO } from '@zerologementvacant/models';

import { type Event, fromEventDTO } from '../models/Event';
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
      transformResponse: (events: EventDTO[]) =>
        events
          .map(fromEventDTO)
          .filter((event) => !isHousingOwnerSecondaryChange(event))
    })
  })
});

function isHousingOwnerSecondaryChange(event: Event) {
  // Exclude events that are not relevant for the owner view
  if (event.type === 'housing:owner-updated') {
    const previousRank = (event as Event<'housing:owner-updated'>).nextOld.rank;
    const newRank = (event as Event<'housing:owner-updated'>).nextNew.rank;
    return previousRank >= 2 && newRank >= 2;
  }

  return false;
}

export const { useFindEventsByHousingQuery, useFindEventsByOwnerQuery } =
  eventApi;
