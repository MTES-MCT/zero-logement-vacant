import { ContactPoint, DraftContactPoint } from '../../../shared';
import { zlvApi } from './api.service';

export const contactPointsApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findContactPoints: builder.query<
      ContactPoint[],
      {
        establishmentId: string;
        publicOnly: boolean;
      }
    >({
      query: ({ establishmentId, publicOnly, }) =>
        `contact-points/${
          publicOnly ? '/public' : ''
        }?establishmentId=${establishmentId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id, }) => ({
                type: 'ContactPoint' as const,
                id,
              })),
              'ContactPoint'
            ]
          : ['ContactPoint'],
    }),
    createContactPoint: builder.mutation<void, DraftContactPoint>({
      query: (draftContactPoint) => ({
        url: 'contact-points',
        method: 'POST',
        body: draftContactPoint,
      }),
      invalidatesTags: ['ContactPoint'],
    }),
    updateContactPoint: builder.mutation<void, ContactPoint>({
      query: ({ id, ...body }) => ({
        url: `contact-points/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id, }) => [
        { type: 'ContactPoint', id, }
      ],
    }),
    removeContactPoint: builder.mutation<void, string>({
      query: (contactPointId) => ({
        url: `contact-points/${contactPointId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, contactPointId) => [
        { type: 'ContactPoint', contactPointId, }
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
