import config from '../utils/config';
import { SignupLink } from '../models/SignupLink';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

export const signupLinkApi = createApi({
  reducerPath: 'signupLinkApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/signup-links`,
  }),
  tagTypes: ['SignupLink'],
  endpoints: (builder) => ({
    sendActivationEmail: builder.mutation<void, string>({
      query: (email) => ({
        url: '',
        method: 'POST',
        body: email,
      }),
      transformErrorResponse: (response) => {
        if (response.status >= 500) {
          throw new Error('Cannot create sign-up link');
        }
      },
      invalidatesTags: ['SignupLink'],
    }),
    getSignupLink: builder.query<SignupLink, string>({
      query: (id) => id,
      providesTags: () => ['SignupLink'],
      transformErrorResponse: (response) => {
        if (response.status >= 500) {
          throw new Error('Cannot get sign-up link');
        }
      },
    }),
  }),
});

export const { useSendActivationEmailMutation, useGetSignupLinkQuery } =
  signupLinkApi;
