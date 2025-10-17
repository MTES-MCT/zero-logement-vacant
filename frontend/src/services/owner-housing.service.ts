import type {
  BaseHousingOwnerDTO,
  HousingDTO
} from '@zerologementvacant/models';

import { zlvApi } from './api.service';

type OwnerHousingDTO = BaseHousingOwnerDTO & HousingDTO;

export const ownerHousingApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOwnerHousings: builder.query<ReadonlyArray<OwnerHousingDTO>, string>({
      query: (id) => `owners/${id}/housings`,
      providesTags: (_result, _error, id) => [{ type: 'OwnerHousing', id }],
      transformResponse: (ownerHousings: OwnerHousingDTO[]) => ownerHousings
    })
  })
});

export const { useFindOwnerHousingsQuery } = ownerHousingApi;
