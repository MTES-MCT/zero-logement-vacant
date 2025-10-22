import type {
  HousingDTO,
  NoteDTO,
  NotePayloadDTO
} from '@zerologementvacant/models';

import { fromNoteDTO, type Note } from '../models/Note';
import { zlvApi } from './api.service';

export const noteApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findNotesByHousing: builder.query<Note[], string>({
      query: (id) => `housing/${id}/notes`,
      providesTags: (notes) =>
        notes
          ? [
              ...notes.map((note) => ({
                type: 'Note' as const,
                id: note.id
              })),
              { type: 'Note', id: 'LIST' }
            ]
          : [{ type: 'Note', id: 'LIST' }],
      transformResponse: (notes: ReadonlyArray<NoteDTO>) =>
        notes.map(fromNoteDTO)
    }),

    createNoteByHousing: builder.mutation<
      NoteDTO,
      Pick<HousingDTO, 'id'> & NotePayloadDTO
    >({
      query: ({ id, ...payload }) => ({
        url: `housing/${id}/notes`,
        method: 'POST',
        body: payload
      }),
      invalidatesTags: () => ['Note']
    }),

    updateNote: builder.mutation<NoteDTO, Pick<NoteDTO, 'id'> & NotePayloadDTO>(
      {
        query: ({ id, ...payload }) => ({
          url: `notes/${id}`,
          method: 'PUT',
          body: payload
        }),
        invalidatesTags: (_result, _error, args) => [
          { type: 'Note', id: args.id }
        ]
      }
    ),

    removeNote: builder.mutation<void, Note>({
      query: (note) => ({
        url: `notes/${note.id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (_result, _error, note) => [
        { type: 'Note', id: note.id }
      ]
    })
  })
});

export const {
  useFindNotesByHousingQuery,
  useCreateNoteByHousingMutation,
  useUpdateNoteMutation,
  useRemoveNoteMutation
} = noteApi;
