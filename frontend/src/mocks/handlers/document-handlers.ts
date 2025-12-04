import type { DocumentDTO, DocumentPayload } from '@zerologementvacant/models';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { constants } from 'node:http2';

import config from '~/utils/config';
import data from './data';

const update = http.put<{ id: string }, DocumentPayload, DocumentDTO | Error>(
  `${config.apiEndpoint}/api/documents/:id`,
  async ({ params, request }) => {
    const document = data.documents.get(params.id);
    if (!document) {
      return HttpResponse.json(
        {
          name: 'DocumentMissingError',
          message: `Document ${params.id} missing`
        },
        {
          status: constants.HTTP_STATUS_NOT_FOUND
        }
      );
    }

    const payload = await request.json();
    const updated: DocumentDTO = {
      ...document,
      filename: payload.filename,
      updatedAt: new Date().toJSON()
    };
    data.documents.set(document.id, updated);
    return HttpResponse.json(document, {
      status: constants.HTTP_STATUS_OK
    });
  }
);

const remove = http.delete<{ id: string }, never, null | Error>(
  `${config.apiEndpoint}/api/documents/:id`,
  async ({ params }) => {
    const exists = data.documents.has(params.id);
    if (!exists) {
      return HttpResponse.json(
        {
          name: 'DocumentMissingError',
          message: `Document ${params.id} missing`
        },
        {
          status: constants.HTTP_STATUS_NOT_FOUND
        }
      );
    }

    data.documents.delete(params.id);
    return HttpResponse.json(null, {
      status: constants.HTTP_STATUS_NO_CONTENT
    });
  }
);

// TODO
// const createByHousing =

// TODO
// const listByHousing =

export const documentHandlers: RequestHandler[] = [update, remove];
