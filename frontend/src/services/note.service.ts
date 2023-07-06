import config from '../utils/config';
import authService from './auth.service';
import { Note } from '../models/Note';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { NoteDTO } from '../../../shared/models/NoteDTO';
import { parseISO } from 'date-fns';

export const noteApi = createApi({
  reducerPath: 'noteApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/notes`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Note'],
  endpoints: (builder) => ({
    findNotesByHousing: builder.query<Note[], string>({
      query: (housingId) => `/housing/${housingId}`,
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
