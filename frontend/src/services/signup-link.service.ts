import { SignupLink } from '../models/SignupLink';
import { zlvApi } from './api.service';

export const signupLinkApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    sendActivationEmail: builder.mutation<void, string>({
      query: (email) => ({
        url: 'signup-links',
        method: 'POST',
        body: { email }
      }),
      transformErrorResponse: (response) => {
        if (typeof response.status === 'number' && response.status >= 500) {
          throw new Error('Cannot create sign-up link');
        }
      },
      invalidatesTags: ['SignupLink']
    }),
    getActivationEmail: builder.query<SignupLink, string>({
      query: (id) => `signup-links/${id}`,
      transformErrorResponse: (response) => {
        if (typeof response.status === 'number' && response.status === 404) {
          throw new Error('Cannot find sign-up link');
        }
      },
    }),
  })
});

export const { useSendActivationEmailMutation, useGetActivationEmailQuery } = signupLinkApi;
