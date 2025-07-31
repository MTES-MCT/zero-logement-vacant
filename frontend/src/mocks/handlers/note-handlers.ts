import { NoteDTO, NotePayloadDTO } from '@zerologementvacant/models';
import { genNoteDTO, genUserDTO } from '@zerologementvacant/models/fixtures';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import config from '../../utils/config';
import data from './data';

interface PathParams {
  id: string;
}

export const noteHandlers: RequestHandler[] = [
  http.get<PathParams, never, NoteDTO[]>(
    `${config.apiEndpoint}/api/housing/:id/notes`,
    async ({ params }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const housingNotes = data.housingNotes.get(housing.id) ?? [];
      const notes = housingNotes
        .map((id) => data.notes.find((note) => note.id === id) ?? null)
        .filter((note) => note !== null);
      return HttpResponse.json(notes, {
        status: constants.HTTP_STATUS_OK
      });
    }
  ),

  // Create a note for a housing
  http.post<PathParams, NotePayloadDTO, NoteDTO | null>(
    `${config.apiEndpoint}/api/housing/:id/notes`,
    async ({ params, request }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      const creator = genUserDTO();
      const note: NoteDTO = {
        ...genNoteDTO(creator),
        ...payload
      };
      data.notes.push(note);
      data.housingNotes.set(
        housing.id,
        (data.housingNotes.get(housing.id) ?? []).concat(note.id)
      );
      return HttpResponse.json(note, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),

  // Update a note
  http.put<PathParams, NotePayloadDTO, NoteDTO | null>(
    `${config.apiEndpoint}/api/notes/:id`,
    async ({ params, request }) => {
      const note = data.notes.find((note) => note.id === params.id);
      if (!note) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      note.content = payload.content;

      return HttpResponse.json(note, {
        status: constants.HTTP_STATUS_OK
      });
    }
  ),

  // Remove a note
  http.delete<PathParams, never, null>(
    `${config.apiEndpoint}/api/notes/:id`,
    async ({ params }) => {
      const note = data.notes.find((note) => note.id === params.id);
      if (!note) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const index = data.notes.findIndex((note) => note.id === params.id);
      data.notes.splice(index, 1);
      data.housingNotes.forEach((ids) => {
        const j = ids.findIndex((id) => id === params.id);
        if (j >= 0) {
          ids.splice(j, 1);
        }
      });

      return HttpResponse.json(null, {
        status: constants.HTTP_STATUS_NO_CONTENT
      });
    }
  )
];
