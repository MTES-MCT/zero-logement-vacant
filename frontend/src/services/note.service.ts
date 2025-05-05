import {
  HousingDTO,
  NoteDTO,
  NotePayloadDTO
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns';
import { Note } from '../models/Note';
import { fromUserDTO } from '../models/User';
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

function parseNote(note: NoteDTO): Note {
  if (!note.creator) {
    throw new Error('Note creator is missing');
  }

  return {
    ...note,
    createdAt: parseISO(note.createdAt),
    creator: fromUserDTO(note.creator)
  };
}

export const { useFindNotesByHousingQuery, useCreateNoteByHousingMutation } =
  noteApi;
