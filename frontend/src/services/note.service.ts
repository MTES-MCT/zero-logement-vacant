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
      query: (housingId) => `notes/housing/${housingId}`,
      providesTags: () => ['Note'],
      transformResponse: (response: any[]) => response.map((_) => parseNote(_))
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
