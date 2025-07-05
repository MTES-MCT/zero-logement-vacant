import { DatafoncierHousing } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const datafoncierApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOneHousing: builder.query<DatafoncierHousing, string>({
      query: (id: string) => `datafoncier/housing/${id}`,
      providesTags: (_housing, _error, id) => [
        { type: 'Datafoncier housing', id }
      ]
    })
  })
});
