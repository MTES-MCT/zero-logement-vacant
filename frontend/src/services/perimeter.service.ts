import type { GeoPerimeterDTO } from '@zerologementvacant/models';

import { zlvApi } from './api.service';

export const perimeterAPI = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findPerimeters: builder.query<GeoPerimeterDTO[], void>({
      query: () => '/geo/perimeters',
      providesTags: (perimeters) =>
        perimeters
          ? [
              ...perimeters.map((perimeter) => ({
                type: 'GeoPerimeter' as const,
                id: perimeter.id
              })),
              {
                type: 'GeoPerimeter',
                id: 'LIST'
              }
            ]
          : [{ type: 'GeoPerimeter', id: 'LIST' }]
    })
  })
});

export const { useFindPerimetersQuery } = perimeterAPI;
