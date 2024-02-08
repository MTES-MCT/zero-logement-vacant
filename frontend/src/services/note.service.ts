import { Note } from '../models/Note';
import { NoteDTO } from '../../../shared';
import { parseISO } from 'date-fns';
import { zlvApi } from './api.service';

export const noteApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findNotesByHousing: builder.query<Note[], string>({
      query: (housingId) => `notes/housing/${housingId}`,
      providesTags: () => ['Note'],
      transformResponse: (response: any[]) => response.map((_) => parseNote(_)),
    }),
  }),
});

const parseNote = (noteDTO: NoteDTO): Note => ({
  ...noteDTO,
  createdAt: parseISO(noteDTO.createdAt),
});

export const { useFindNotesByHousingQuery } = noteApi;
