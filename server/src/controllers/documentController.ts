import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  HousingDocumentDTO,
  isAdmin,
  type DocumentDTO,
  type DocumentPayload,
  type HousingDTO
} from '@zerologementvacant/models';
import { createS3, generatePresignedUrl } from '@zerologementvacant/utils/node';
import async from 'async';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'node:http2';
import { v4 as uuidv4 } from 'uuid';

import DocumentMissingError from '~/errors/documentMissingError';
import HousingMissingError from '~/errors/housingMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import {
  HousingDocumentApi,
  toHousingDocumentDTO
} from '~/models/HousingDocumentApi';
import housingDocumentRepository from '~/repositories/housingDocumentRepository';
import housingRepository from '~/repositories/housingRepository';

const logger = createLogger('documentController');
const s3 = createS3({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey
});

const listByHousing: RequestHandler<
  { id: HousingDTO['id'] },
  HousingDocumentDTO[]
> = async (request, response): Promise<void> => {
  const { establishment, params } = request as AuthenticatedRequest<{
    id: HousingDTO['id'];
  }>;
  logger.debug('Finding documents by housing...', { housing: params.id });
  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: establishment.geoCodes,
    id: params.id
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  const documents = await housingDocumentRepository.findByHousing(housing, {
    filters: {
      deleted: false
    }
  });

  // Generate pre-signed URLs for all documents using async.map
  const documentsWithURLs = await async.map(
    documents,
    async (document: HousingDocumentApi) => {
      const presignedUrl = await generatePresignedUrl({
        s3,
        bucket: config.s3.bucket,
        key: document.s3Key
      });
      return toHousingDocumentDTO(document, presignedUrl);
    }
  );

  response.status(constants.HTTP_STATUS_OK).json(documentsWithURLs);
};

const createByHousing: RequestHandler<
  { id: HousingDTO['id'] },
  ReadonlyArray<HousingDocumentDTO>,
  never
> = async (request, response) => {
  const { establishment, params, user } = request as AuthenticatedRequest<
    { id: HousingDTO['id'] },
    HousingDocumentDTO,
    never
  >;
  const files = request.files ?? [];
  if (!files.length) {
    throw new Error('No file uploaded');
  }

  logger.debug('Create a document by housing', {
    housing: params.id,
    files: files.map((file) => ({ name: file.originalname }))
  });

  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: establishment.geoCodes,
    id: params.id
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  const documents: Array<HousingDocumentApi> = files.map((file) => ({
    id: uuidv4(),
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    filename: file.originalname,
    s3Key: file.key,
    contentType: file.contentType,
    sizeBytes: file.size,
    createdBy: user.id,
    createdAt: new Date().toJSON(),
    updatedAt: null,
    deletedAt: null,
    creator: user
  }));
  await housingDocumentRepository.createMany(documents);

  const documentsWithURLs: ReadonlyArray<HousingDocumentDTO> = await async.map(
    documents,
    async (document: HousingDocumentApi) => {
      const url = await generatePresignedUrl({
        s3,
        bucket: config.s3.bucket,
        key: document.s3Key
      });
      return toHousingDocumentDTO(document, url);
    }
  );
  response.status(constants.HTTP_STATUS_CREATED).json(documentsWithURLs);
};

const updateByHousing: RequestHandler<
  { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
  DocumentDTO,
  DocumentPayload
> = async (request, response) => {
  const { body, params, user, establishment } = request as AuthenticatedRequest<
    { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
    DocumentDTO,
    DocumentPayload
  >;
  logger.debug('Updating document...', {
    housingId: params.housingId,
    documentId: params.documentId
  });

  const document = await housingDocumentRepository.get(params.documentId, {
    housing: isAdmin(user)
      ? undefined
      : establishment.geoCodes.map((geoCode) => ({
          geoCode: geoCode,
          id: params.housingId
        }))
  });
  if (!document) {
    throw new DocumentMissingError(params.documentId);
  }

  const updated: HousingDocumentApi = {
    ...document,
    filename: body.filename,
    updatedAt: new Date().toJSON()
  };
  await housingDocumentRepository.update(updated);

  const presignedUrl = await generatePresignedUrl({
    s3,
    bucket: config.s3.bucket,
    key: updated.s3Key
  });
  response
    .status(constants.HTTP_STATUS_OK)
    .json(toHousingDocumentDTO(updated, presignedUrl));
};

const removeByHousing: RequestHandler<
  { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
  void
> = async (request, response) => {
  const { params, user, establishment } = request as AuthenticatedRequest<
    { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
    void
  >;

  const document = await housingDocumentRepository.get(params.documentId, {
    housing: isAdmin(user)
      ? undefined
      : establishment.geoCodes.map((geoCode) => ({
          geoCode: geoCode,
          id: params.housingId
        }))
  });
  if (!document) {
    throw new DocumentMissingError(params.documentId);
  }

  const command = new DeleteObjectCommand({
    Bucket: config.s3.bucket,
    Key: document.s3Key
  });
  await s3.send(command);
  await housingDocumentRepository.remove(document);
  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const documentController = {
  listByHousing,
  createByHousing,
  updateByHousing,
  removeByHousing
};

export default documentController;
