import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import { NoteDTO } from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

interface PathParams {
  id: string;
}

export const noteHandlers: RequestHandler[] = [
  http.get<PathParams, never, NoteDTO[]>(
    `${config.apiEndpoint}/api/notes/housing/:id`,
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
  )
];
