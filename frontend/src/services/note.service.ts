import {
  HousingDTO,
  NoteDTO,
  NotePayloadDTO
} from '@zerologementvacant/models';

import { fromNoteDTO, Note } from '../models/Note';
import { zlvApi } from './api.service';

export const noteApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findNotesByHousing: builder.query<Note[], string>({
      query: (id) => `housing/${id}/notes`,
      providesTags: () => ['Note'],
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
    })
  })
});

export const { useFindNotesByHousingQuery, useCreateNoteByHousingMutation } =
  noteApi;
