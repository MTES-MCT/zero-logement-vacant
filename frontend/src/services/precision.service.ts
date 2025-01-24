import { Precision } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const precisionAPI = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findPrecisions: builder.query<Precision[], void>({
      query: () => 'precisions',
      providesTags: () => ['Precision']
    })
  })
});

export const { useFindPrecisionsQuery } = precisionAPI;
