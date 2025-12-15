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
      ReadonlyArray<HousingDocumentDTO | FileValidationError>,
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
      DocumentPayload & {
        housingId: HousingDTO['id'];
        documentId: DocumentDTO['id'];
      }
    >({
      query: ({ housingId, documentId, ...payload }) => ({
        url: `housing/${housingId}/documents/${documentId}`,
        method: 'PUT',
        body: payload
      }),
      async onQueryStarted(
        { housingId, documentId, ...patch },
        { dispatch, queryFulfilled }
      ) {
        const patchResult = dispatch(
          documentApi.util.updateQueryData(
            'listHousingDocuments',
            housingId,
            (documents) => {
              const document = documents.find(
                (draft) => draft.id === documentId
              );
              if (document) {
                Object.assign(document, patch);
              }
            }
          )
        );

        queryFulfilled.catch(patchResult.undo);
      }
    }),

    removeDocument: builder.mutation<
      void,
      { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] }
    >({
      query: ({ housingId, documentId }) => ({
        url: `housing/${housingId}/documents/${documentId}`,
        method: 'DELETE'
      }),
      invalidatesTags: (_result, _error, { housingId, documentId }) => [
        { type: 'Document', id: documentId },
        { type: 'Document', id: `LIST-${housingId}` }
      ]
    })
  })
});

export const {
  useListHousingDocumentsQuery,
  useUploadHousingDocumentsMutation,
  useUpdateDocumentMutation,
  useRemoveDocumentMutation
} = documentApi;
