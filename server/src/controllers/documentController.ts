import {
  ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
  HousingDocumentDTO,
  MAX_HOUSING_DOCUMENT_SIZE_IN_MiB,
  type DocumentDTO,
  type DocumentPayload,
  type HousingDTO
} from '@zerologementvacant/models';
import { type HousingDocumentPayload } from '@zerologementvacant/schemas';
import { createS3, generatePresignedUrl } from '@zerologementvacant/utils/node';
import async from 'async';
import { Array, Either } from 'effect';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'node:http2';
import { match } from 'ts-pattern';
import { v4 as uuidv4 } from 'uuid';

import DocumentMissingError from '~/errors/documentMissingError';
import FilesMissingError from '~/errors/filesMissingError';
import { FileValidationError } from '~/errors/fileValidationError';
import HousingMissingError from '~/errors/housingMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { toDocumentDTO, type DocumentApi } from '~/models/DocumentApi';
import {
  HousingDocumentApi,
  toHousingDocumentDTO
} from '~/models/HousingDocumentApi';
import documentRepository from '~/repositories/documentRepository';
import housingDocumentRepository from '~/repositories/housingDocumentRepository';
import housingRepository from '~/repositories/housingRepository';
import { upload, validate } from '~/services/document-upload';

const logger = createLogger('documentController');
const s3 = createS3({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey
});

const create: RequestHandler<
  never,
  ReadonlyArray<DocumentDTO | FileValidationError>,
  never
> = async (request, response) => {
  const { establishment, user } = request as AuthenticatedRequest<
    never,
    DocumentDTO | FileValidationError,
    never
  >;
  const files = request.files ?? [];

  if (!files.length) {
    throw new FilesMissingError();
  }

  logger.info('Uploading documents', {
    fileCount: files.length,
    establishment: establishment.id
  });

  // NEW IMPLEMENTATION
  const now = new Date().toJSON();
  const [year, month, day] = now.split('-');
  const documentsOrErrors = await async.map(
    files,
    async (
      file: Express.Multer.File
    ): Promise<Either.Either<DocumentDTO, unknown>> => {
      try {
        await validate(file, {
          accept: ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
          maxSize: MAX_HOUSING_DOCUMENT_SIZE_IN_MiB * 1024 ** 2
        });

        const key = `documents/${establishment.id}/${year}/${month}/${day}/${uuidv4()}`;
        await upload(file, {
          key: key
        });
        const document: DocumentApi = {
          id: uuidv4(),
          filename: file.originalname,
          s3Key: key,
          contentType: file.mimetype,
          sizeBytes: file.size,
          establishmentId: establishment.id,
          createdBy: user.id,
          creator: user,
          createdAt: now,
          updatedAt: null,
          deletedAt: null
        };
        await documentRepository.insert(document);

        const url = await generatePresignedUrl({
          s3,
          bucket: config.s3.bucket,
          key: document.s3Key
        });

        return Either.right(toDocumentDTO(document, url));
      } catch (error) {
        return Either.left(error);
      }
    }
  );

  const documents = Array.getRights(documentsOrErrors);
  const errors = Array.getLefts(documentsOrErrors);

  logger.info('Document upload completed', {
    total: files.length,
    succeeded: documents.length,
    failed: errors.length
  });

  const status = match({ documents, errors })
    .returnType<number>()
    .with({ errors: [] }, () => constants.HTTP_STATUS_CREATED)
    .with({ documents: [] }, () => constants.HTTP_STATUS_BAD_REQUEST)
    .otherwise(() => constants.HTTP_STATUS_MULTI_STATUS);

  response.status(status).json(Array.map(documentsOrErrors, Either.merge));
};

const update: RequestHandler<
  Pick<DocumentDTO, 'id'>,
  DocumentDTO,
  DocumentPayload
> = async (request, response) => {
  const { establishment, params, body } = request as AuthenticatedRequest<
    Pick<DocumentDTO, 'id'>,
    DocumentDTO,
    DocumentPayload
  >;

  logger.info('Updating document', { id: params.id });

  const document = await documentRepository.findOne(params.id, {
    filters: {
      establishmentIds: [establishment.id],
      deleted: false
    }
  });
  if (!document) {
    throw new DocumentMissingError(params.id);
  }

  const updated: DocumentApi = {
    ...document,
    filename: body.filename
  };
  await documentRepository.update(updated);

  const url = await generatePresignedUrl({
    s3,
    bucket: config.s3.bucket,
    key: updated.s3Key
  });
  response.status(constants.HTTP_STATUS_OK).json(toDocumentDTO(updated, url));
};

const remove: RequestHandler<Pick<DocumentDTO, 'id'>, void, never> = async (
  request,
  response
) => {
  const { establishment, params } = request as AuthenticatedRequest<
    Pick<DocumentDTO, 'id'>,
    void,
    never
  >;

  logger.info('Removing document...', { id: params.id });

  const document = await documentRepository.findOne(params.id, {
    filters: {
      establishmentIds: [establishment.id],
      deleted: false
    }
  });
  if (!document) {
    throw new DocumentMissingError(params.id);
  }

  await documentRepository.remove(params.id);

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const linkToHousing: RequestHandler<
  { id: HousingDTO['id'] },
  ReadonlyArray<DocumentDTO>,
  HousingDocumentPayload
> = async (request, response) => {
  const { establishment, params, body } = request as AuthenticatedRequest<
    { id: HousingDTO['id'] },
    ReadonlyArray<DocumentDTO>,
    HousingDocumentPayload
  >;

  logger.info('Linking documents to housing', {
    housing: params.id,
    documentCount: body.documentIds.length
  });

  // Validate housing exists and belongs to establishment
  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: establishment.geoCodes,
    id: params.id
  });

  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  // Validate documents exist and belong to establishment
  const documents = await documentRepository.find({
    filters: {
      ids: body.documentIds,
      establishmentIds: [establishment.id],
      deleted: false
    }
  });

  if (documents.length !== body.documentIds.length) {
    const foundIds = documents.map((document) => document.id);
    const missingIds = body.documentIds.filter((id) => !foundIds.includes(id));
    throw new DocumentMissingError(...missingIds);
  }

  // Create housing document links (cartesian product)
  const links = body.documentIds.map((documentId) => ({
    document_id: documentId,
    housing_id: housing.id,
    housing_geo_code: housing.geoCode
  }));
  await housingDocumentRepository.linkMany(links);

  // Generate pre-signed URLs for linked documents
  const documentsWithURLs = await async.map(
    documents,
    async (document: DocumentApi) => {
      const url = await generatePresignedUrl({
        s3,
        bucket: config.s3.bucket,
        key: document.s3Key
      });
      return toDocumentDTO(document, url);
    }
  );

  response.status(constants.HTTP_STATUS_CREATED).json(documentsWithURLs);
};

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

  const documents = await housingDocumentRepository.find({
    filters: {
      housingIds: [housing],
      deleted: false
    }
  });

  // Generate pre-signed URLs for all documents using async.map
  const documentsWithURLs = await async.map(
    [...documents],
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

const removeByHousing: RequestHandler<
  { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
  void
> = async (request, response) => {
  const { params, establishment } = request as AuthenticatedRequest<
    { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
    void
  >;

  logger.info('Removing document-housing association', {
    housing: params.housingId,
    document: params.documentId
  });

  // Validate housing exists and belongs to establishment
  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: establishment.geoCodes,
    id: params.housingId
  });
  if (!housing) {
    throw new HousingMissingError(params.housingId);
  }

  // Validate association exists
  const links = await housingDocumentRepository.find({
    filters: { housingIds: [housing] }
  });
  const hasLink = links.some((link) => link.id === params.documentId);
  if (!hasLink) {
    throw new DocumentMissingError(params.documentId);
  }

  // Remove association only (keep document)
  await housingDocumentRepository.unlink({
    documentId: params.documentId,
    housingId: housing.id,
    housingGeoCode: housing.geoCode
  });

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const documentController = {
  create,
  update,
  remove,
  linkToHousing,
  listByHousing,
  removeByHousing
};

export default documentController;
