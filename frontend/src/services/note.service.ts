import { parseISO } from 'date-fns';

import {
  HousingDTO,
  NoteDTO,
  NotePayloadDTO
} from '@zerologementvacant/models';
import { Note } from '../models/Note';
import { zlvApi } from './api.service';

export const noteApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findNotesByHousing: builder.query<Note[], string>({
      query: (id) => `housing/${id}/notes`,
      providesTags: () => ['Note'],
      transformResponse: (notes: ReadonlyArray<NoteDTO>) => notes.map(parseNote)
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

const parseNote = (noteDTO: NoteDTO): Note => ({
  ...noteDTO,
  createdAt: parseISO(noteDTO.createdAt)
});

export const { useFindNotesByHousingQuery, useCreateNoteByHousingMutation } =
  noteApi;
