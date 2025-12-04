import type { DocumentDTO, DocumentPayload } from '@zerologementvacant/models';
import { Predicate } from 'effect';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { constants } from 'node:http2';
import { v4 as uuidv4 } from 'uuid';

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

const listByHousing = http.get<{ id: string }, never, DocumentDTO[]>(
  `${config.apiEndpoint}/api/housing/:id/documents`,
  async ({ params }) => {
    const documents = (data.housingDocuments.get(params.id) ?? [])
      .map((ref) => data.documents.get(ref.id))
      .filter(Predicate.isNotUndefined);

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_OK
    });
  }
);

const createByHousing = http.post<{ id: string }, never, DocumentDTO[] | Error>(
  `${config.apiEndpoint}/api/housing/:id/documents`,
  async ({ params, request }) => {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return HttpResponse.json(
        {
          name: 'Error',
          message: 'No file uploaded'
        },
        {
          status: constants.HTTP_STATUS_BAD_REQUEST
        }
      );
    }

    const housing = data.housings.find((housing) => housing.id === params.id);
    if (!housing) {
      return HttpResponse.json(
        {
          name: 'HousingMissingError',
          message: `Housing ${params.id} missing`
        },
        {
          status: constants.HTTP_STATUS_NOT_FOUND
        }
      );
    }

    // Get a user from the data to use as creator
    const creator = data.users[0];
    if (!creator) {
      return HttpResponse.json(
        {
          name: 'Error',
          message: 'No user available'
        },
        {
          status: constants.HTTP_STATUS_INTERNAL_SERVER_ERROR
        }
      );
    }

    const documents: DocumentDTO[] = files.map((file) => {
      const blob = file as File;
      const document: DocumentDTO = {
        id: uuidv4(),
        filename: blob.name,
        url: URL.createObjectURL(blob),
        contentType: blob.type,
        sizeBytes: blob.size,
        createdAt: new Date().toJSON(),
        updatedAt: null,
        creator
      };
      data.documents.set(document.id, document);
      return document;
    });

    const existingDocs = data.housingDocuments.get(params.id) ?? [];
    data.housingDocuments.set(params.id, [
      ...existingDocs,
      ...documents.map((doc) => ({ id: doc.id }))
    ]);

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);

export const documentHandlers: RequestHandler[] = [
  listByHousing,
  createByHousing,
  update,
  remove
];
