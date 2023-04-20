import config from '../utils/config';
import {
  ContactPoint,
  DraftContactPoint,
} from '../../../shared/models/ContactPoint';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import authService from './auth.service';

export const contactPointsApi = createApi({
  reducerPath: 'contactPointsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/contact-points`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['ContactPoint'],
  endpoints: (builder) => ({
    findContactPoints: builder.query<
      ContactPoint[],
      {
        establishmentId: string;
        publicOnly: boolean;
      }
    >({
      query: ({ establishmentId, publicOnly }) =>
        `${publicOnly ? '/public' : ''}?establishmentId=${establishmentId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'ContactPoint' as const,
                id,
              })),
              'ContactPoint',
            ]
          : ['ContactPoint'],
    }),
    createContactPoint: builder.mutation<void, DraftContactPoint>({
      query: (draftContactPoint) => ({
        url: '',
        method: 'POST',
        body: draftContactPoint,
      }),
      invalidatesTags: ['ContactPoint'],
    }),
    updateContactPoint: builder.mutation<void, ContactPoint>({
      query: ({ id, ...body }) => ({
        url: id,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ContactPoint', id },
      ],
    }),
    removeContactPoint: builder.mutation<void, string>({
      query: (contactPointId) => ({
        url: contactPointId,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, contactPointId) => [
        { type: 'ContactPoint', contactPointId },
      ],
    }),
  }),
});

export const {
  useCreateContactPointMutation,
  useUpdateContactPointMutation,
  useFindContactPointsQuery,
  useRemoveContactPointMutation,
} = contactPointsApi;
