import { DeleteObjectCommand } from '@aws-sdk/client-s3';
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
import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import {
  DocumentFilenameEquivalence,
  toDocumentDTO,
  type DocumentApi
} from '~/models/DocumentApi';
import { DocumentEventApi, HousingDocumentEventApi } from '~/models/EventApi';
import {
  HousingDocumentApi,
  toHousingDocumentDTO
} from '~/models/HousingDocumentApi';
import documentRepository from '~/repositories/documentRepository';
import eventRepository from '~/repositories/eventRepository';
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

  const now = new Date().toJSON();
  const [year, month, day] = now.substring(0, 'yyyy-mm-dd'.length).split('-');
  const documentsOrErrors = await async.map(
    files,
    async (
      file: Express.Multer.File
    ): Promise<Either.Either<DocumentDTO, FileValidationError>> => {
      try {
        await validate(file, {
          accept: ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
          maxSize: MAX_HOUSING_DOCUMENT_SIZE_IN_MiB * 1024 ** 2
        });

        const id = uuidv4();
        const key = `documents/${establishment.id}/${year}/${month}/${day}/${id}`;
        await upload(file, {
          key: key
        });
        const document: DocumentApi = {
          id: id,
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
        if (error instanceof FileValidationError) {
          return Either.left(error);
        }
        return Either.left(
          new FileValidationError(
            'unknown',
            'upload_failed',
            'File upload failed'
          )
        );
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

  // Create document:created events for successful uploads
  if (documents.length > 0) {
    const events = documents.map<DocumentEventApi>((document) => ({
      id: uuidv4(),
      type: 'document:created',
      name: 'Création d’un document',
      nextOld: null,
      nextNew: { filename: document.filename },
      createdAt: new Date().toJSON(),
      createdBy: user.id,
      documentId: document.id
    }));

    await eventRepository.insertManyDocumentEvents(events);
  }

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
  const { body, params, user, establishment } = request as AuthenticatedRequest<
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

  const updateEvent: DocumentEventApi | null = !DocumentFilenameEquivalence(
    document,
    updated
  )
    ? {
        // Create document:updated event
        id: uuidv4(),
        type: 'document:updated',
        name: 'Modification d’un document',
        nextOld: { filename: document.filename },
        nextNew: { filename: updated.filename },
        createdAt: new Date().toJSON(),
        createdBy: user.id,
        documentId: params.id
      }
    : null;

  await startTransaction(async () => {
    await Promise.all([
      documentRepository.update(updated),
      updateEvent
        ? eventRepository.insertManyDocumentEvents([updateEvent])
        : Promise.resolve()
    ]);
  });

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
  const { establishment, params, user } = request as AuthenticatedRequest<
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

  // Find all housings linked to this document
  const housingDocuments = await housingDocumentRepository.find({
    filters: { documentIds: [params.id] }
  });

  // Create housing:document-removed events for each linked housing
  const removeEvents = housingDocuments.map<HousingDocumentEventApi>(
    (housingDocument) => ({
      id: uuidv4(),
      type: 'housing:document-removed',
      name: 'Suppression d’un document du logement',
      nextOld: { filename: document.filename },
      nextNew: null,
      createdAt: new Date().toJSON(),
      createdBy: user.id,
      documentId: params.id,
      housingGeoCode: housingDocument.housingGeoCode,
      housingId: housingDocument.housingId
    })
  );

  // Create document:removed event
  const documentRemoveEvent: DocumentEventApi = {
    id: uuidv4(),
    type: 'document:removed',
    name: 'Suppression d’un document',
    nextOld: { filename: document.filename },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: request.user!.id,
    documentId: params.id
  };
  const deleteCommand = new DeleteObjectCommand({
    Bucket: config.s3.bucket,
    Key: document.s3Key
  });

  await startTransaction(async () => {
    await Promise.all([
      eventRepository.insertManyHousingDocumentEvents(removeEvents),
      eventRepository.insertManyDocumentEvents([documentRemoveEvent]),
      housingDocumentRepository.unlinkMany({ documentIds: [params.id] }),
      documentRepository.remove(params.id)
    ]);
    await s3.send(deleteCommand);
  });

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
  // Create housing:document-attached events for each link
  const attachEvents = documents.map<HousingDocumentEventApi>((document) => ({
    id: uuidv4(),
    type: 'housing:document-attached',
    name: 'Ajout d’un document au logement',
    nextOld: null,
    nextNew: { filename: document.filename },
    createdAt: new Date().toJSON(),
    createdBy: request.user!.id,
    documentId: document.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));

  await startTransaction(async () => {
    await Promise.all([
      housingDocumentRepository.linkMany(links),
      eventRepository.insertManyHousingDocumentEvents(attachEvents)
    ]);
  });

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

  // Get document details for event
  const document = links.find((link) => link.id === params.documentId);
  if (!document) {
    throw new DocumentMissingError(params.documentId);
  }

  // Create housing:document-detached event
  const detachEvent: HousingDocumentEventApi = {
    id: uuidv4(),
    type: 'housing:document-detached',
    name: 'Retrait d’un document du logement',
    nextOld: { filename: document.filename },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: request.user!.id,
    documentId: params.documentId,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  };

  await startTransaction(async () => {
    await Promise.all([
      eventRepository.insertManyHousingDocumentEvents([detachEvent]),
      // Remove association only (keep document)
      housingDocumentRepository.unlink({
        documentId: params.documentId,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      })
    ]);
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
