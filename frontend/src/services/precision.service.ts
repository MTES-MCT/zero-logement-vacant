import { Precision } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const precisionAPI = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findPrecisions: builder.query<Precision[], unknown>({
      query: () => 'precisions',
      providesTags: () => ['Precision']
    })
  })
});

export const { useFindPrecisionsQuery } = precisionAPI;
