import {
  DocumentDTO,
  DraftCreationPayload,
  DraftDTO,
  DraftUpdatePayload,
  SignatoryPayload,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import { createS3 } from '@zerologementvacant/utils/node';
import async from 'async';
import { Predicate } from 'effect';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import type { ElementOf } from 'ts-essentials';
import { v4 as uuidv4 } from 'uuid';

import CampaignMissingError from '~/errors/campaignMissingError';
import DocumentMissingError from '~/errors/documentMissingError';
import DraftMissingError from '~/errors/draftMissingError';
import config from '~/infra/config';
import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { type DocumentApi } from '~/models/DocumentApi';
import { DraftApi, toDraftDTO } from '~/models/DraftApi';
import { SenderApi, type SignatoryApi } from '~/models/SenderApi';
import campaignDraftRepository from '~/repositories/campaignDraftRepository';
import campaignRepository from '~/repositories/campaignRepository';
import documentRepository from '~/repositories/documentRepository';
import draftRepository from '~/repositories/draftRepository';
import senderRepository from '~/repositories/senderRepository';

const logger = createLogger('draftController');
const s3 = createS3(config.s3);

export interface DraftParams extends Record<string, string> {
  id: string;
}

interface DraftQuery {
  campaign?: string;
}

const list: RequestHandler<never, DraftDTO[], never, DraftQuery> = async (
  request,
  response
): Promise<void> => {
  const { auth, query } = request as AuthenticatedRequest<
    never,
    DraftDTO[],
    never,
    DraftQuery
  >;
  logger.info('Finding drafts...', {
    establishment: auth.establishmentId,
    query
  });

  const drafts: DraftApi[] = await draftRepository.find({
    filters: {
      campaign: query.campaign,
      establishment: auth.establishmentId
    }
  });

  const dtos = await async.map(
    drafts,
    async (draft: ElementOf<typeof drafts>) =>
      toDraftDTO(draft, {
        s3,
        bucket: config.s3.bucket
      })
  );
  response.status(constants.HTTP_STATUS_OK).json(dtos);
};

interface ResolveDocumentsOptions {
  ids: ReadonlyArray<DocumentDTO['id'] | null>;
  establishmentId: EstablishmentDTO['id'];
}

async function resolveDocuments(
  options: ResolveDocumentsOptions
): Promise<Map<DocumentApi['id'], DocumentApi>> {
  const ids = options.ids.filter(Predicate.isNotNull);
  if (ids.length === 0) {
    return new Map();
  }

  const documents = await documentRepository.find({
    filters: {
      ids: ids,
      establishmentIds: [options.establishmentId],
      deleted: false
    }
  });
  const missing = ids.filter(
    (id) => !documents.some((document) => document.id === id)
  );
  if (missing.length > 0) {
    logger.warn('Some documents are missing', {
      missingDocumentIds: missing,
      establishment: options.establishmentId
    });
    throw new DocumentMissingError(...missing);
  }

  return new Map<DocumentApi['id'], DocumentApi>(
    documents.map((document) => [document.id, document])
  );
}

function buildSignatory(
  payload: SignatoryPayload | null | undefined,
  documents: Map<DocumentApi['id'], DocumentApi>
): SignatoryApi | null {
  if (!payload) {
    return null;
  }

  return {
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,
    file: null,
    document: payload.document
      ? (documents.get(payload.document) ?? null)
      : null
  };
}

const createNext: RequestHandler<
  never,
  DraftDTO,
  DraftCreationPayload,
  never
> = async (request, response): Promise<void> => {
  const { auth, body } = request as AuthenticatedRequest<
    never,
    DraftDTO,
    DraftCreationPayload,
    never
  >;

  const campaign = await campaignRepository.findOne({
    id: body.campaign,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(body.campaign);
  }

  const documentIds = [
    body.logo[0],
    body.logo[1],
    body.sender?.signatories?.[0]?.document ?? null,
    body.sender?.signatories?.[1]?.document ?? null
  ];
  const documents = await resolveDocuments({
    ids: documentIds,
    establishmentId: auth.establishmentId
  });

  const logoNext: [DocumentApi | null, DocumentApi | null] = [
    body.logo[0] ? (documents.get(body.logo[0]) ?? null) : null,
    body.logo[1] ? (documents.get(body.logo[1]) ?? null) : null
  ];

  const now = new Date().toJSON();
  const sender: SenderApi = {
    id: uuidv4(),
    name: body.sender?.name ?? null,
    service: body.sender?.service ?? null,
    firstName: body.sender?.firstName ?? null,
    lastName: body.sender?.lastName ?? null,
    address: body.sender?.address ?? null,
    email: body.sender?.email ?? null,
    phone: body.sender?.phone ?? null,
    signatories: [
      buildSignatory(body.sender?.signatories?.[0], documents),
      buildSignatory(body.sender?.signatories?.[1], documents)
    ],
    establishmentId: auth.establishmentId,
    createdAt: now,
    updatedAt: now
  };

  const draft: DraftApi = {
    id: uuidv4(),
    subject: body.subject,
    body: body.body,
    logo: null,
    logoNext,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    createdAt: now,
    updatedAt: now,
    establishmentId: auth.establishmentId
  };

  await startTransaction(async () => {
    await senderRepository.save(sender);
    await draftRepository.save(draft);
    await campaignDraftRepository.save(campaign, draft);
  });

  response.status(constants.HTTP_STATUS_CREATED).json(
    await toDraftDTO(draft, {
      s3,
      bucket: config.s3.bucket
    })
  );
};

const updateNext: RequestHandler<
  DraftParams,
  DraftDTO,
  DraftUpdatePayload,
  never
> = async (request, response): Promise<void> => {
  const { auth, params, body } = request as AuthenticatedRequest<
    DraftParams,
    DraftDTO,
    DraftUpdatePayload,
    never
  >;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!draft) throw new DraftMissingError(params.id);

  const documentIds = [
    body.logo[0],
    body.logo[1],
    body.sender?.signatories?.[0]?.document ?? null,
    body.sender?.signatories?.[1]?.document ?? null
  ];
  const documents = await resolveDocuments({
    ids: documentIds,
    establishmentId: auth.establishmentId
  });

  const logoNext: [DocumentApi | null, DocumentApi | null] = [
    body.logo[0] ? (documents.get(body.logo[0]) ?? null) : null,
    body.logo[1] ? (documents.get(body.logo[1]) ?? null) : null
  ];

  const sender: SenderApi = {
    id: draft.sender.id,
    name: body.sender?.name ?? null,
    service: body.sender?.service ?? null,
    firstName: body.sender?.firstName ?? null,
    lastName: body.sender?.lastName ?? null,
    address: body.sender?.address ?? null,
    email: body.sender?.email ?? null,
    phone: body.sender?.phone ?? null,
    signatories: [
      buildSignatory(body.sender?.signatories?.[0], documents),
      buildSignatory(body.sender?.signatories?.[1], documents)
    ],
    createdAt: draft.sender.createdAt,
    updatedAt: new Date().toJSON(),
    establishmentId: draft.sender.establishmentId
  };

  const updated: DraftApi = {
    ...draft,
    subject: body.subject,
    body: body.body,
    logo: null,
    logoNext,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    updatedAt: new Date().toJSON()
  };

  await startTransaction(async () => {
    await senderRepository.save(sender);
    await draftRepository.save(updated);
  });

  response.status(constants.HTTP_STATUS_OK).json(
    await toDraftDTO(updated, {
      s3,
      bucket: config.s3.bucket
    })
  );
};

const draftController = {
  list,
  createNext,
  updateNext
};

export default draftController;
