import type {
  DocumentDTO,
  DocumentPayload,
  HousingDTO
} from '@zerologementvacant/models';
import { Predicate } from 'effect';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { constants } from 'node:http2';
import { v4 as uuidv4 } from 'uuid';

import config from '~/utils/config';
import data from './data';

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

const upload = http.post<never, FormData, DocumentDTO[] | Error>(
  `${config.apiEndpoint}/api/documents`,
  async ({ request }) => {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return HttpResponse.json(
        { name: 'FilesMissingError', message: 'No files uploaded' },
        { status: constants.HTTP_STATUS_BAD_REQUEST }
      );
    }

    const creator = data.users[0];
    if (!creator) {
      return HttpResponse.json(
        { name: 'Error', message: 'No user available' },
        { status: constants.HTTP_STATUS_INTERNAL_SERVER_ERROR }
      );
    }

    const documents: DocumentDTO[] = files.map((file) => {
      const document: DocumentDTO = {
        id: uuidv4(),
        filename: file.name,
        url: URL.createObjectURL(file),
        contentType: file.type,
        sizeBytes: file.size,
        createdAt: new Date().toJSON(),
        updatedAt: null,
        creator
      };
      data.documents.set(document.id, document);
      return document;
    });

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);

const linkToHousing = http.post<
  { id: HousingDTO['id'] },
  { documentIds: DocumentDTO['id'][] },
  DocumentDTO[] | Error
>(
  `${config.apiEndpoint}/api/housing/:id/documents`,
  async ({ params, request }) => {
    const { documentIds } = await request.json();

    const housing = data.housings.find((housing) => housing.id === params.id);
    if (!housing) {
      return HttpResponse.json(
        {
          name: 'HousingMissingError',
          message: `Housing ${params.id} missing`
        },
        { status: constants.HTTP_STATUS_NOT_FOUND }
      );
    }

    // Verify all documents exist
    const documents = documentIds
      .map((id) => data.documents.get(id))
      .filter(Predicate.isNotUndefined);

    if (documents.length !== documentIds.length) {
      return HttpResponse.json(
        { name: 'DocumentMissingError', message: 'Some documents not found' },
        { status: constants.HTTP_STATUS_BAD_REQUEST }
      );
    }

    // Link documents to housing
    const existingDocuments = data.housingDocuments.get(params.id) ?? [];
    const newRefs = documentIds.map((id) => ({ id }));
    data.housingDocuments.set(params.id, [...existingDocuments, ...newRefs]);

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);

const update = http.put<
  { id: DocumentDTO['id'] },
  DocumentPayload,
  DocumentDTO | Error
>(`${config.apiEndpoint}/api/documents/:id`, async ({ params, request }) => {
  const document = data.documents.get(params.id);
  if (!document) {
    return HttpResponse.json(
      {
        name: 'DocumentMissingError',
        message: `Document ${params.id} missing`
      },
      { status: constants.HTTP_STATUS_NOT_FOUND }
    );
  }

  const payload = await request.json();
  const updated: DocumentDTO = {
    ...document,
    filename: payload.filename,
    updatedAt: new Date().toJSON()
  };
  data.documents.set(document.id, updated);

  return HttpResponse.json(updated, {
    status: constants.HTTP_STATUS_OK
  });
});

const removeByHousing = http.delete<
  { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
  never,
  null | Error
>(
  `${config.apiEndpoint}/api/housing/:housingId/documents/:documentId`,
  async ({ params }) => {
    const exists = data.housingDocuments
      .get(params.housingId)
      ?.map((document) => document.id)
      ?.includes(params.documentId);
    if (!exists) {
      return HttpResponse.json(
        {
          name: 'DocumentMissingError',
          message: `Document ${params.documentId} not linked to housing`
        },
        {
          status: constants.HTTP_STATUS_NOT_FOUND
        }
      );
    }

    data.housingDocuments.set(
      params.housingId,
      (data.housingDocuments.get(params.housingId) ?? []).filter(
        (document) => document.id !== params.documentId
      )
    );

    return HttpResponse.json(null, {
      status: constants.HTTP_STATUS_NO_CONTENT
    });
  }
);

export const documentHandlers: RequestHandler[] = [
  listByHousing,
  upload,
  linkToHousing,
  update,
  removeByHousing
];
