import { CeremaUser } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const portailDFApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserAccess: builder.query<CeremaUser, string>({
      query: (email) => `user-access?email=${email}`,
      transformErrorResponse: (response) => {
        if (typeof response.status === 'number' && response.status === 404) {
          throw new Error('Cannot find user access');
        }
      },
    }),
  })
});

export const { useGetUserAccessQuery } = portailDFApi;
