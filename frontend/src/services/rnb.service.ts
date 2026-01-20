import type { DatafoncierHousing } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const rnbApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findHousingByRnbId: builder.query<DatafoncierHousing[], string>({
      query: (rnbId: string) => `rnb/housing/${rnbId}`,
      providesTags: (_housings, _error, rnbId) => [
        { type: 'Datafoncier housing', id: rnbId }
      ]
    })
  })
});

export const { useFindHousingByRnbIdQuery, useLazyFindHousingByRnbIdQuery } =
  rnbApi;
