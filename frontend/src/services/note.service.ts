import config from '../utils/config';
import authService from './auth.service';
import { Note } from '../models/Note';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { NoteCreationDTO } from '../../../shared/models/NoteDTO';

export const noteApi = createApi({
  reducerPath: 'noteApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/notes`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  endpoints: (builder) => ({
    createNote: builder.mutation<void, Note>({
      query: (note) => ({
        url: '',
        method: 'POST',
        body: toEventCreationDTO(note),
      }),
    }),
  }),
});
const toEventCreationDTO = (note: Note): NoteCreationDTO => ({
  title: note.title,
  content: note.content,
  contactKind: note.contactKind,
  ownerId: note.owner?.id,
  housingIds: note.housingList?.map((_) => _.id),
});

export const { useCreateNoteMutation } = noteApi;
