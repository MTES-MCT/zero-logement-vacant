import type {
  DocumentDTO,
  DocumentPayload,
  HousingDocumentDTO,
  HousingDTO
} from '@zerologementvacant/models';
import type { FileValidationError } from '~/models/FileValidationError';

import { zlvApi } from '~/services/api.service';

export const documentApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadDocuments: builder.mutation<
      ReadonlyArray<DocumentDTO | FileValidationError>,
      { files: ReadonlyArray<File> }
    >({
      query: ({ files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });
        return {
          url: 'documents',
          method: 'POST',
          body: formData
        };
      },
      invalidatesTags: ['Document']
    }),

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

    linkDocumentsToHousing: builder.mutation<
      ReadonlyArray<HousingDocumentDTO>,
      { housingId: HousingDTO['id']; documentIds: DocumentDTO['id'][] }
    >({
      query: ({ housingId, documentIds }) => ({
        url: `housing/${housingId}/documents`,
        method: 'POST',
        body: { documentIds }
      }),
      invalidatesTags: (_result, _error, { housingId }) => [
        { type: 'Document', id: `LIST-${housingId}` }
      ]
    }),

    updateDocument: builder.mutation<
      DocumentDTO,
      { documentId: DocumentDTO['id'] } & DocumentPayload
    >({
      query: ({ documentId, ...payload }) => ({
        url: `documents/${documentId}`,
        method: 'PUT',
        body: payload
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: 'Document', id: documentId }
      ]
    }),

    unlinkDocument: builder.mutation<
      void,
      { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] }
    >({
      query: ({ housingId, documentId }) => ({
        url: `housing/${housingId}/documents/${documentId}`,
        method: 'DELETE'
      }),
      async onQueryStarted(
        { housingId, documentId },
        { dispatch, queryFulfilled }
      ) {
        const patchResult = dispatch(
          documentApi.util.updateQueryData(
            'listHousingDocuments',
            housingId,
            (documents) => {
              const index = documents.findIndex(
                (draft) => draft.id === documentId
              );
              if (index !== -1) {
                documents.splice(index, 1);
              }
            }
          )
        );

        queryFulfilled.catch(patchResult.undo);
      }
    })
  })
});

export const {
  useListHousingDocumentsQuery,
  useUploadDocumentsMutation,
  useLinkDocumentsToHousingMutation,
  useUpdateDocumentMutation,
  useUnlinkDocumentMutation
} = documentApi;
