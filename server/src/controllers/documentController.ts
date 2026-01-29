import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
  HousingDocumentDTO,
  isAdmin,
  MAX_HOUSING_DOCUMENT_SIZE_IN_MiB,
  type DocumentDTO,
  type DocumentPayload,
  type HousingDTO
} from '@zerologementvacant/models';
import { createS3, generatePresignedUrl } from '@zerologementvacant/utils/node';
import async from 'async';
import { Array, Either, pipe } from 'effect';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'node:http2';
import type { ElementOf } from 'ts-essentials';
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
import { validateFiles } from '~/services/file-validation';

const logger = createLogger('documentController');
const s3 = createS3({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey
});

/**
 * Generates S3 key path from housing localId and document ID
 * Format: housing-documents/{department}/{commune}/{remaining-digits}/{documentId}
 * Example: housing-documents/12/345/6/7/8/9/1/1/2/3/uuid
 */
function generateS3Key(localId: string, documentId: string): string {
  const department = localId.slice(0, 2);
  const commune = localId.slice(2, 5);
  const remaining = localId.slice(5).split('').join('/');

  return `housing-documents/${department}/${commune}/${remaining}/${documentId}`;
}

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
  ReadonlyArray<HousingDocumentDTO | FileValidationError>,
  never
> = async (request, response) => {
  const { establishment, params, user } = request as AuthenticatedRequest<
    { id: HousingDTO['id'] },
    HousingDocumentDTO | FileValidationError,
    never
  >;
  const files = request.files ?? [];
  if (!files.length) {
    throw new FilesMissingError();
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

  // Validate files
  logger.info('Validating files before upload', {
    housing: params.id,
    fileCount: files.length
  });
  const validationResults = await validateFiles(files, {
    accept: ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS as string[]
  });

  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  });

  const documentsOrErrors: ReadonlyArray<
    Either.Either<HousingDocumentDTO, FileValidationError>
  > = await pipe(
    validationResults,
    Array.map(
      Either.map((file) => {
        const id = uuidv4();
        const s3Key = generateS3Key(housing.localId, id);
        const command = new PutObjectCommand({
          Bucket: config.s3.bucket,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'authenticated-read',
          Metadata: {
            originalName: file.originalname,
            fieldName: file.fieldname
          }
        });
        const document: HousingDocumentApi = {
          id: id,
          filename: file.originalname,
          s3Key: s3Key,
          contentType: file.mimetype,
          sizeBytes: file.size,
          createdBy: user.id,
          createdAt: new Date().toJSON(),
          updatedAt: null,
          deletedAt: null,
          creator: user,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        };

        return { document, command };
      })
    ),
    // Upload files to S3
    async (documentsWithCommandsOrErrors) => {
      return async.map(
        documentsWithCommandsOrErrors,
        async (
          either: ElementOf<typeof documentsWithCommandsOrErrors>
        ): Promise<Either.Either<HousingDocumentApi, FileValidationError>> => {
          // Already an error
          if (Either.isLeft(either)) {
            return Either.left(either.left);
          }

          const { command, document } = either.right;
          try {
            await s3.send(command);
            return Either.right(document);
          } catch (error) {
            logger.error('Failed to upload file to S3', {
              filename: document.filename,
              s3Key: document.s3Key,
              error: error instanceof Error ? error.message : String(error)
            });
            return Either.left(
              new FileValidationError(
                document.filename,
                'invalid_file_type',
                'Failed to upload file to storage',
                {
                  error: error instanceof Error ? error.message : String(error)
                }
              )
            );
          }
        }
      );
    },
    // Save to database
    async (
      promise
    ): Promise<Either.Either<HousingDocumentApi, FileValidationError>[]> => {
      const documentsOrErrors = await promise;
      const documents = Array.getRights(documentsOrErrors);

      if (Array.isNonEmptyArray(documents)) {
        logger.info('Creating documents...', {
          housing: params.id,
          count: documents.length
        });
        await housingDocumentRepository.createMany(documents);
      }

      return documentsOrErrors;
    },
    // Generate pre-signed URLs and build final DTOs
    async (promise) => {
      const documentsOrErrors = await promise;
      return async.map(
        documentsOrErrors,
        async (either: ElementOf<typeof documentsOrErrors>) => {
          if (Either.isLeft(either)) {
            return Either.left(either.left);
          }

          const document = either.right;
          const url = await generatePresignedUrl({
            s3,
            bucket: config.s3.bucket,
            key: document.s3Key
          });
          return Either.right(toHousingDocumentDTO(document, url));
        }
      );
    }
  );

  const documents = Array.getRights(documentsOrErrors);
  const errors = Array.getLefts(documentsOrErrors);
  logger.info('Document creation completed', {
    housing: params.id,
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
  create,
  update,
  remove,
  listByHousing,
  createByHousing,
  updateByHousing,
  removeByHousing
};

export default documentController;
