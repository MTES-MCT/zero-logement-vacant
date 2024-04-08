import { zlvApi } from './api.service';

export const signupLinkApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    sendActivationEmail: builder.mutation<void, string>({
      query: (email) => ({
        url: 'signup-links',
        method: 'POST',
        body: { email },
      }),
      transformErrorResponse: (response) => {
        if (response.status >= 500) {
          throw new Error('Cannot create sign-up link');
        }
      },
      invalidatesTags: ['SignupLink'],
    }),
  }),
});

export const { useSendActivationEmailMutation } = signupLinkApi;
