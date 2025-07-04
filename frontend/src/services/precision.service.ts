import { HousingDTO, Precision } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

const REFERENTIAL_ID = 'REFERENTIAL';

export const precisionAPI = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findPrecisions: builder.query<Precision[], void>({
      query: () => 'precisions',
      providesTags: () => [{ type: 'Precision', id: REFERENTIAL_ID }]
    }),

    findPrecisionsByHousing: builder.query<Precision[], { housingId: string }>({
      query: (params) => `housing/${params.housingId}/precisions`,
      providesTags: (result, error, arg) => [
        { type: 'Precision', id: arg.housingId }
      ]
    }),

    saveHousingPrecisions: builder.mutation<
      Precision[],
      HousingPrecisionsPayload
    >({
      query: (payload) => ({
        url: `housing/${payload.housing}/precisions`,
        method: 'PUT',
        body: payload.precisions
      }),
      invalidatesTags: (result, error, payload) => [
        {
          type: 'Precision',
          id: payload.housing
        },
        {
          type: 'HousingEvent',
          id: payload.housing
        }
      ]
    })
  })
});

interface HousingPrecisionsPayload {
  housing: HousingDTO['id'];
  precisions: Precision['id'][];
}

export const {
  useFindPrecisionsQuery,
  useFindPrecisionsByHousingQuery,
  useSaveHousingPrecisionsMutation
} = precisionAPI;
