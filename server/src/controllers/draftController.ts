import { generateCampaignPDF } from '@zerologementvacant/pdf/node';
import {
  DocumentDTO,
  DraftCreationPayload,
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftPreviewPayloadDTO,
  DraftUpdatePayload,
  DraftUpdatePayloadDTO,
  HOUSING_KIND_VALUES,
  SignatoryPayload,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import { createS3 } from '@zerologementvacant/utils/node';
import async from 'async';
import { Predicate } from 'effect';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
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
import {
  fromSignatoryDTO,
  SenderApi,
  type SignatoryApi
} from '~/models/SenderApi';
import campaignDraftRepository from '~/repositories/campaignDraftRepository';
import campaignRepository from '~/repositories/campaignRepository';
import documentRepository from '~/repositories/documentRepository';
import draftRepository from '~/repositories/draftRepository';
import senderRepository from '~/repositories/senderRepository';
import { isUUIDParam } from '~/utils/validators';

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

const partialDraftValidators: ValidationChain[] = [
  body('body').optional({ nullable: true }).isString(),
  body('sender').optional({ nullable: true }).isObject(),
  body('logo').optional({ nullable: true }).isArray({ min: 0, max: 2 }),
  body('logo.*.*').optional().isString(),
  body('sender.signatoryFile').optional({ nullable: true }).isObject(),
  body('sender.signatoryFile.*').optional().isString()
];
const senderValidators: ValidationChain[] = [
  ...['name', 'service', 'firstName', 'lastName', 'address'].map((prop) =>
    body(`sender.${prop}`)
      .optional({ nullable: true })
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim()
  ),
  ...[
    'email',
    'phone',
    'signatoryLastName',
    'signatoryFirstName',
    'signatoryRole'
  ].map((prop) =>
    body(`sender.${prop}`)
      .optional({ nullable: true })
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim()
  )
];

async function create(
  request: Request<never, DraftDTO, DraftCreationPayloadDTO, never>,
  response: Response<DraftDTO>
) {
  const { auth, body } = request as AuthenticatedRequest<
    never,
    DraftDTO,
    DraftCreationPayloadDTO,
    never
  >;

  const campaign = await campaignRepository.findOne({
    id: body.campaign,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(body.campaign);
  }

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
      !!body.sender?.signatories?.[0]
        ? fromSignatoryDTO(body.sender.signatories[0])
        : null,
      !!body.sender?.signatories?.[1]
        ? fromSignatoryDTO(body.sender.signatories[1])
        : null
    ],
    establishmentId: auth.establishmentId,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON()
  };
  const draft: DraftApi = {
    id: uuidv4(),
    subject: body.subject,
    body: body.body,
    logo: body.logo,
    logoNext: [null, null],
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    establishmentId: auth.establishmentId
  };
  await senderRepository.save(sender);
  await draftRepository.save(draft);
  await campaignDraftRepository.save(campaign, draft);
  response.status(constants.HTTP_STATUS_CREATED).json(
    await toDraftDTO(draft, {
      s3,
      bucket: config.s3.bucket
    })
  );
}

async function preview(
  request: Request<DraftParams, Buffer, DraftPreviewPayloadDTO>,
  response: Response<Buffer>
): Promise<void> {
  const { auth, body, params, user } = request as AuthenticatedRequest<
    DraftParams,
    Buffer,
    DraftPreviewPayloadDTO
  >;
  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const draftDTO = await toDraftDTO(draft, {
    s3,
    bucket: config.s3.bucket
  });

  const housing = {
    ...body.housing,
    owner: body.owner
  };

  const stream = await generateCampaignPDF({
    campaign: {
      id: 'preview',
      title: draftDTO.subject ?? 'Preview',
      description: '',
      status: 'draft',
      filters: {},
      createdAt: new Date().toJSON(),
      createdBy: user,
      sentAt: null,
      returnCount: null,
      housingCount: 1,
      ownerCount: 1,
      returnRate: null
    },
    draft: draftDTO,
    housings: [housing]
  });

  response
    .status(constants.HTTP_STATUS_OK)
    .type('pdf');
  const reader = stream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    response.write(value);
  }
  response.end();
}

const previewValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('housing').isObject().withMessage('housing must be an object'),
  body('housing.geoCode')
    .isString()
    .withMessage('geoCode must be a string')
    .isLength({ min: 5, max: 5 })
    .withMessage('geoCode must be 5 characters long')
    .notEmpty()
    .withMessage('geoCode is required'),
  body('housing.localId').isString().isLength({ min: 12, max: 12 }),
  body('housing.rawAddress').isArray().isLength({ min: 1 }),
  body('housing.plotId').isString().optional({
    nullable: true
  }),
  body('housing.housingKind')
    .isString()
    .withMessage('Must be a string')
    .isIn(HOUSING_KIND_VALUES)
    .withMessage(`Must be one of ${HOUSING_KIND_VALUES.join(', ')}`)
    .notEmpty()
    .withMessage('kind is required'),
  body('housing.livingArea').isInt().notEmpty(),
  body('housing.buildingYear')
    .optional({
      nullable: true
    })
    .isInt(),
  body('housing.energyConsumption')
    .optional({
      nullable: true
    })
    .isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  body('owner').isObject().withMessage('owner must be an object'),
  body('owner.fullName')
    .isString()
    .notEmpty()
    .withMessage('fullName is required'),
  body('owner.rawAddress').isArray().isLength({ min: 1 }),
  body('owner.rawAddress[*]')
    .isString()
    .notEmpty()
    .withMessage('address is required')
];

async function update(request: Request, response: Response<DraftDTO>) {
  const { auth, params } = request as AuthenticatedRequest;
  const body = request.body as DraftUpdatePayloadDTO;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const signatories = body.sender?.signatories ?? [null, null];
  const sender: SenderApi = {
    id: draft.sender.id,
    name: body.sender.name,
    service: body.sender.service,
    firstName: body.sender.firstName,
    lastName: body.sender.lastName,
    address: body.sender.address,
    email: body.sender.email,
    phone: body.sender.phone,
    signatories: [
      signatories[0] ? fromSignatoryDTO(signatories[0]) : null,
      signatories[1] ? fromSignatoryDTO(signatories[1]) : null
    ],
    createdAt: draft.sender.createdAt,
    updatedAt: new Date().toJSON(),
    establishmentId: draft.sender.establishmentId
  };
  const updated: DraftApi = {
    ...draft,
    subject: body.subject,
    body: body.body,
    logo: body.logo,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    updatedAt: new Date().toJSON()
  };
  await senderRepository.save(sender);
  await draftRepository.save(updated);
  logger.info('Draft updated', {
    draft: draft.id,
    establishment: auth.establishmentId
  });

  response.status(constants.HTTP_STATUS_OK).json(
    await toDraftDTO(updated, {
      s3,
      bucket: config.s3.bucket
    })
  );
}
const updateValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('subject')
    .optional({ nullable: true })
    .isString()
    .withMessage('subject is required'),
  body('body')
    .optional({ nullable: true })
    .isString()
    .withMessage('body is required'),
  body('writtenAt')
    .optional({ nullable: true })
    .isString()
    .withMessage('writtenAt must be a string')
    .trim()
    .isLength({ min: 10, max: 10 })
    .isISO8601({ strict: true, strictSeparator: true }),
  body('writtenFrom')
    .optional({ nullable: true })
    .isString()
    .withMessage('writtenFrom must be a string')
    .trim()
    .withMessage('writtenFrom is required'),
  body('sender').isObject().withMessage('Sender must be an object'),
  ...partialDraftValidators,
  ...senderValidators
];

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
  create,
  createNext,
  preview,
  previewValidators,
  update,
  updateNext,
  updateValidators
};

export default draftController;
