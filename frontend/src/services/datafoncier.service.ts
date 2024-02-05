import { DatafoncierHousing } from '../../../shared';
import { getURLQuery } from '../utils/fetchUtils';
import { zlvApi } from './api.service';

export const datafoncierApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findHousing: builder.query<DatafoncierHousing[], DatafoncierHousingQuery>({
      query: (params) => `datafoncier/housing${getURLQuery(params)}`,
      providesTags: () => [{ type: 'Datafoncier housing', id: 'LIST' }],
    }),
    findOneHousing: builder.query<DatafoncierHousing, string>({
      query: (id: string) => `datafoncier/housing/${id}`,
      providesTags: (housing, error, id) => [
        { type: 'Datafoncier housing', id },
      ],
    }),
  }),
});

interface DatafoncierHousingQuery
  extends Record<string, string | null | undefined> {
  geoCode: string;
  address?: string;
  idpar?: string;
}

export const { useLazyFindOneHousingQuery } = datafoncierApi;
