import config from '../utils/config';
import authService from './auth.service';
import {
  HousingNoteCreation,
  isHousingNoteCreation,
  isOwnerNoteCreation,
  Note,
  OwnerNoteCreation,
} from '../models/Note';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { NoteCreationDTO, NoteDTO } from '../../../shared/models/NoteDTO';
import { parseISO } from 'date-fns';

export const noteApi = createApi({
  reducerPath: 'noteApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/notes`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Note'],
  endpoints: (builder) => ({
    createNote: builder.mutation<void, OwnerNoteCreation | HousingNoteCreation>(
      {
        query: (noteCreationDTO) => ({
          url: '',
          method: 'POST',
          body: toNoteCreationDTO(noteCreationDTO),
        }),
      }
    ),
    findNotesByHousing: builder.query<Note[], string>({
      query: (housingId) => `/housing/${housingId}`,
      providesTags: () => ['Note'],
      transformResponse: (response: any[]) => response.map((_) => parseNote(_)),
    }),
  }),
});
const toNoteCreationDTO = (
  noteCreation: OwnerNoteCreation | HousingNoteCreation
): NoteCreationDTO => ({
  content: noteCreation.content,
  noteKind: noteCreation.noteKind,
  ownerId: isOwnerNoteCreation(noteCreation)
    ? noteCreation.owner.id
    : undefined,
  housingIds: isHousingNoteCreation(noteCreation)
    ? noteCreation.housingList.map((_) => _.id)
    : undefined,
});

const parseNote = (noteDTO: NoteDTO): Note => ({
  ...noteDTO,
  createdAt: parseISO(noteDTO.createdAt),
});

export const { useCreateNoteMutation, useFindNotesByHousingQuery } = noteApi;
