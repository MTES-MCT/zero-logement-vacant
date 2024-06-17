import async from 'async';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { DRAFT_TEMPLATE_FILE, DraftData, pdf } from '@zerologementvacant/draft';
import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
  FileUploadDTO,
  replaceVariables,
} from '@zerologementvacant/models';
import { createS3, toBase64, getContent, getBase64Content } from '@zerologementvacant/utils';
import { DraftApi, toDraftDTO } from '~/models/DraftApi';
import draftRepository, { DraftFilters } from '~/repositories/draftRepository';
import campaignDraftRepository from '~/repositories/campaignDraftRepository';
import campaignRepository from '~/repositories/campaignRepository';
import CampaignMissingError from '~/errors/campaignMissingError';
import DraftMissingError from '~/errors/draftMissingError';
import { isUUIDParam } from '~/utils/validators';
import { logger } from '~/infra/logger';
import { SenderApi } from '~/models/SenderApi';
import senderRepository from '~/repositories/senderRepository';
import config from '~/infra/config';

interface DraftQuery {
  campaign?: string;
}

async function list(request: Request, response: Response) {
  const { auth, query } = request as AuthenticatedRequest;

  const filters: DraftFilters = {
    ...(fp.pick(['campaign'], query) as DraftQuery),
    establishment: auth.establishmentId,
  };

  const drafts: DraftApi[] = await draftRepository.find({
    filters,
  });

  // Download logos from S3
  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });

  interface EnrichedDraftDTO extends Omit<DraftDTO, 'logo'> {
    logo: FileUploadDTO[] | null
  }

  const originalDrafts = await drafts.map(toDraftDTO);
  const enrichedDrafts = await Promise.all(originalDrafts.map(async (draft) => {
    const enrichedDraft = draft as EnrichedDraftDTO;
    const logos = draft.logo ? await Promise.all(draft.logo.map(async (logo) => {
      const { response, content } = await getContent(logo, { s3, bucket: config.s3.bucket });
      return {
        id: logo,
        type: response.ContentType,
        url: logo,
        content: toBase64(content, response.ContentType),
      } as FileUploadDTO;
    })) : null;

    enrichedDraft.logo = logos;
    return enrichedDraft;
  })) as unknown as EnrichedDraftDTO;

  response.status(constants.HTTP_STATUS_OK).json(enrichedDrafts);
}

const partialDraftValidators: ValidationChain[] = [
  body('body').optional({ nullable: true }).isString(),
  body('sender').optional({ nullable: true }).isObject(),
  body('logo').optional({ nullable: true }).isArray({ min: 0, max: 2 }),
  body('logo.*.id').optional().isString().withMessage('id must be a string'),
  body('logo.*.type').optional().isString().withMessage('type must be a string'),
  body('logo.*.content').optional().isString().withMessage('content must be a string'),
  body('logo.*.url').optional().isString().withMessage('url must be a string'),
];
const senderValidators: ValidationChain[] = [
  ...['name', 'service', 'firstName', 'lastName', 'address'].map((prop) =>
    body(`sender.${prop}`)
      .optional({ nullable: true })
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim(),
  ),
  ...[
    'email',
    'phone',
    'signatoryLastName',
    'signatoryFirstName',
    'signatoryRole',
    'signatoryFile',
  ].map((prop) =>
    body(`sender.${prop}`)
      .optional({ nullable: true })
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim(),
  ),
];

async function create(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;
  const body = request.body as DraftCreationPayloadDTO;
  const logos = request.body.logo as FileUploadDTO[];
  request.body.logo = logos.map(logo => logo.id);

  const campaign = await campaignRepository.findOne({
    id: body.campaign,
    establishmentId: auth.establishmentId,
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
    signatoryLastName: body.sender?.signatoryLastName ?? null,
    signatoryFirstName: body.sender?.signatoryFirstName ?? null,
    signatoryRole: body.sender?.signatoryRole ?? null,
    signatoryFile: body.sender?.signatoryFile ?? null,
    establishmentId: auth.establishmentId,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
  };
  const draft: DraftApi = {
    id: uuidv4(),
    subject: body.subject,
    body: body.body,
    logo: body.logo,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    establishmentId: auth.establishmentId,
  };
  await senderRepository.save(sender);
  await draftRepository.save(draft);
  await campaignDraftRepository.save(campaign, draft);
  response.status(constants.HTTP_STATUS_CREATED).json(toDraftDTO(draft));
}
const createValidators: ValidationChain[] = [
  body('subject')
    .optional({ nullable: true })
    .isString()
    .withMessage('subject must be a string'),
  body('body')
    .optional({ nullable: true })
    .isString()
    .withMessage('body must be a string'),
  body('campaign').isUUID().withMessage('Must be an UUID'),
  body('writtenAt')
    .optional({ nullable: true })
    .isString()
    .withMessage('writtenAt must be a string')
    .trim(),
  body('writtenFrom')
    .optional({ nullable: true })
    .isString()
    .withMessage('writtenFrom must be a string')
    .trim(),
  body('sender')
    .optional({ nullable: true })
    .isObject()
    .withMessage('Sender must be an object'),
  ...partialDraftValidators,
  ...senderValidators,
];

async function preview(request: Request, response: Response) {
  const { auth, body, params } = request as AuthenticatedRequest;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  // Download logos from S3
  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });
  const logos = await async.map(draft.logo ?? [], async (logo: string) =>
    getBase64Content(logo, { s3, bucket: config.s3.bucket }),
  );

  const signature = draft.sender.signatoryFile
    ? await getBase64Content(draft.sender.signatoryFile, {
        s3,
        bucket: config.s3.bucket,
      })
    : null;
  const html = await pdf.compile<DraftData>(DRAFT_TEMPLATE_FILE, {
    subject: draft.subject ?? '',
    logo: logos,
    watermark: true,
    body: draft.body
      ? replaceVariables(draft.body, {
          housing: body.housing,
          owner: body.owner,
        })
      : '',
    sender: {
      name: draft.sender.name ?? '',
      service: draft.sender.service ?? '',
      firstName: draft.sender.firstName ?? '',
      lastName: draft.sender.lastName ?? '',
      address: draft.sender.address ?? '',
      phone: draft.sender.phone ?? '',
      signatoryLastName: draft.sender.signatoryLastName ?? '',
      signatoryFirstName: draft.sender.signatoryFirstName ?? '',
      signatoryRole: draft.sender.signatoryRole ?? '',
      signatoryFile: signature,
    },
    writtenAt: draft.writtenAt ?? '',
    writtenFrom: draft.writtenFrom ?? '',
    owner: {
      fullName: body.owner.fullName,
      address: body.owner.address,
      additionalAddress: body.owner.additionalAddress,
    },
  });
  const finalPDF = await pdf.fromHTML([html]);
  response.status(constants.HTTP_STATUS_OK).type('pdf').send(finalPDF);
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
  body('housing.localId').isInt().isLength({ min: 12, max: 12 }),
  body('housing.rawAddress').isArray().isLength({ min: 1 }),
  body('housing.cadastralReference').isString().notEmpty(),
  body('housing.housingKind').isString().isIn(['MAISON', 'APPART']).notEmpty(),
  body('housing.livingArea').isInt().notEmpty(),
  body('housing.buildingYear').isInt().notEmpty(),
  body('housing.energyConsumption')
    .optional({
      nullable: true,
    })
    .isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  body('owner').isObject().withMessage('owner must be an object'),
  body('owner.fullName')
    .isString()
    .notEmpty()
    .withMessage('fullName is required'),
  body('owner.address').isArray().isLength({ min: 1 }),
  body('owner.address[*]')
    .isString()
    .notEmpty()
    .withMessage('address is required'),
  body('owner.additionalAddress')
    .optional({
      nullable: true,
    })
    .isString(),
];

async function update(request: Request, response: Response<DraftDTO>) {
  const { auth, params } = request as AuthenticatedRequest;
  const logos = request.body.logo as FileUploadDTO[];
  request.body.logo = logos.map(logo => logo.id);

  const body = request.body as DraftUpdatePayloadDTO;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const sender: SenderApi = {
    id: draft.sender.id,
    name: body.sender.name,
    service: body.sender.service,
    firstName: body.sender.firstName,
    lastName: body.sender.lastName,
    address: body.sender.address,
    email: body.sender.email,
    phone: body.sender.phone,
    signatoryLastName: body.sender.signatoryLastName,
    signatoryFirstName: body.sender.signatoryFirstName,
    signatoryRole: body.sender.signatoryRole,
    signatoryFile: body.sender.signatoryFile,
    createdAt: draft.sender.createdAt,
    updatedAt: new Date().toJSON(),
    establishmentId: draft.sender.establishmentId,
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
    updatedAt: new Date().toJSON(),
  };
  await senderRepository.save(sender);
  await draftRepository.save(updated);
  logger.info('Draft updated', updated);

  response.status(constants.HTTP_STATUS_OK).json(toDraftDTO(updated));
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
  ...senderValidators,
];

const draftController = {
  list,
  create,
  createValidators,
  preview,
  previewValidators,
  update,
  updateValidators,
};

export default draftController;
