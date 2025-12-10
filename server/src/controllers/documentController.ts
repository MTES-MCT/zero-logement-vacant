import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  HousingDocumentDTO,
  isAdmin,
  type DocumentDTO,
  type DocumentPayload
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
import { FileValidationError, validateFiles } from '~/services/file-validation';

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
  ReadonlyArray<HousingDocumentDTO | FileValidationError>,
  never
> = async (request, response) => {
  const { establishment, params, user } = request as AuthenticatedRequest<
    PathParams,
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
  const validationResults = await validateFiles(files);

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
        const command = new PutObjectCommand({
          Bucket: config.s3.bucket,
          Key: id,
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
          s3Key: id,
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

const documentController = {
  listByHousing,
  createByHousing,
  update,
  remove
};

export default documentController;
