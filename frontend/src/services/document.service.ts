import type {
  DocumentDTO,
  DocumentPayload,
  HousingDocumentDTO
} from '@zerologementvacant/models';

import { zlvApi } from '~/services/api.service';

export const documentApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    listHousingDocuments: builder.query<HousingDocumentDTO[], string>({
      query: (housingId) => `housing/${housingId}/documents`,
      providesTags: (documents, _error, housingId) =>
        documents
          ? [
              ...documents.map((document) => ({
                type: 'Document' as const,
                id: document.id
              })),
              { type: 'Document' as const, id: `LIST-${housingId}` }
            ]
          : [{ type: 'Document' as const, id: `LIST-${housingId}` }]
    }),

    uploadHousingDocuments: builder.mutation<
      HousingDocumentDTO[],
      { housingId: string; files: ReadonlyArray<File> }
    >({
      query: ({ housingId, files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });
        return {
          url: `housing/${housingId}/documents`,
          method: 'POST',
          body: formData
        };
      },
      invalidatesTags: (_documents, _error, { housingId }) => [
        { type: 'Document', id: `LIST-${housingId}` }
      ]
    }),

    updateDocument: builder.mutation<
      DocumentDTO,
      DocumentPayload & { id: string }
    >({
      query: ({ id, ...payload }) => ({
        url: `documents/${id}`,
        method: 'PUT',
        body: payload
      }),
      invalidatesTags: (document) =>
        document ? [{ type: 'Document', id: document.id }] : []
    }),

    removeDocument: builder.mutation<void, string>({
      query: (id) => ({
        url: `documents/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Document', id }]
    })
  })
});

export const {
  useListHousingDocumentsQuery,
  useUploadHousingDocumentsMutation,
  useUpdateDocumentMutation,
  useRemoveDocumentMutation
} = documentApi;
