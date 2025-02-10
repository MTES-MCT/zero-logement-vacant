import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import { NoteDTO, NotePayloadDTO } from '@zerologementvacant/models';
import { genNoteDTO, genUserDTO } from '@zerologementvacant/models/fixtures';
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

      const notes = data.housingNotes.get(housing.id) || [];
      return HttpResponse.json(notes, {
        status: constants.HTTP_STATUS_OK
      });
    }
  ),

  // Create a note for a housing
  http.post<PathParams, NotePayloadDTO, NoteDTO>(
    `${config.apiEndpoint}/api/housing/:id/notes`,
    async ({ params, request }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        throw HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      const creator = genUserDTO();
      const note: NoteDTO = {
        ...genNoteDTO(creator),
        ...payload
      };
      data.housingNotes.set(
        housing.id,
        (data.housingNotes.get(housing.id) ?? []).concat(note)
      );
      return HttpResponse.json(note, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  )
];
