import {
  HousingDocumentDTO,
  isAdmin,
  type DocumentDTO,
  type DocumentPayload
} from '@zerologementvacant/models';
import { createS3, generatePresignedUrl } from '@zerologementvacant/utils/node';
import async from 'async';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import DocumentMissingError from '~/errors/documentMissingError';
import ForbiddenError from '~/errors/forbiddenError';
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

interface PathParams extends Record<string, string> {
  id: string;
}

const update: RequestHandler<PathParams, DocumentDTO, DocumentPayload> = async (
  request,
  response
) => {
  const { body, params, user } = request as AuthenticatedRequest<
    PathParams,
    DocumentDTO,
    DocumentPayload
  >;
  logger.debug('Updating document...', { id: params.id });

  const document = await housingDocumentRepository.get(params.id);
  if (!document) {
    throw new DocumentMissingError(params.id);
  }

  // Allow the document creator or an admin to update
  if (!isAdmin(user) && document.creator.id !== user.id) {
    logger.warn('Unauthorized update attempt', {
      user: user.id,
      document: document.id
    });
    throw new ForbiddenError();
  }

  const updated: HousingDocumentApi = {
    ...document,
    filename: body.filename,
    updatedAt: new Date().toJSON()
  };
  await housingDocumentRepository.update(updated);

  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  });

  const presignedUrl = await generatePresignedUrl({
    s3,
    bucket: config.s3.bucket,
    key: updated.s3Key
  });
  response
    .status(constants.HTTP_STATUS_OK)
    .json(toHousingDocumentDTO(updated, presignedUrl));
};

const remove: RequestHandler<PathParams, void> = async (request, response) => {
  const { params, user } = request as AuthenticatedRequest<PathParams>;

  const document = await housingDocumentRepository.get(params.id);
  if (!document) {
    throw new DocumentMissingError(params.id);
  }

  if (!isAdmin(user) && document.creator.id !== user.id) {
    logger.warn('Unauthorized removal attempt', {
      user: user.id,
      document: document.id
    });
    throw new ForbiddenError();
  }

  await housingDocumentRepository.remove(document.id);
  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const listByHousing: RequestHandler<PathParams, HousingDocumentDTO[]> = async (
  request,
  response
): Promise<void> => {
  const { establishment, params } = request as AuthenticatedRequest<PathParams>;

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
  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  });

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
  PathParams,
  ReadonlyArray<HousingDocumentDTO>,
  never
> = async (request, response) => {
  const { establishment, params, user } = request as AuthenticatedRequest<
    PathParams,
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

  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  });

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

const documentController = {
  listByHousing,
  createByHousing,
  update,
  remove
};

export default documentController;
