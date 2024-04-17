import async from 'async';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { DraftApi, toDraftDTO } from '../models/DraftApi';
import draftRepository, { DraftFilters } from '../repositories/draftRepository';
import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
} from '../../shared/models/DraftDTO';
import campaignDraftRepository from '../repositories/campaignDraftRepository';
import campaignRepository from '../repositories/campaignRepository';
import CampaignMissingError from '../errors/campaignMissingError';
import DraftMissingError from '../errors/draftMissingError';
import { isUUIDParam } from '../utils/validators';
import { logger } from '../utils/logger';
import pdf from '../utils/pdf';
import DRAFT_TEMPLATE_FILE, { DraftData } from '../templates/draft';
import { createOrReplaceSender, SenderApi } from '../models/SenderApi';
import senderRepository from '../repositories/senderRepository';
import { replaceVariables } from '../../shared/models/variable-options';
import { createS3, toBase64 } from '../../shared/utils/s3';
import config from '../utils/config';

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
  response.status(constants.HTTP_STATUS_OK).json(drafts.map(toDraftDTO));
}

const partialDraftValidators: ValidationChain[] = [
  body('body').isString().notEmpty().withMessage('body is required'),
  body('sender').isObject().withMessage('sender must be an object'),
  body('logo')
    .isArray({ min: 1, max: 2 })
    .withMessage('logo must be an array of 1 or 2 URL'),
  body('logo.*').notEmpty().withMessage('logo is required'),
  // .isURL({
  //   TODO
  // })
  // .withMessage('logo must be an array of URL'),
];
const senderValidators: ValidationChain[] = [
  ...['name', 'service', 'firstName', 'lastName', 'address'].map((prop) =>
    body(`sender.${prop}`)
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim()
      .notEmpty()
      .withMessage(`${prop} is required`)
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
      .optional({ checkFalsy: true })
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim()
  ),
];

async function create(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;
  const body = request.body as DraftCreationPayloadDTO;

  const campaign = await campaignRepository.findOne({
    id: body.campaign,
    establishmentId: auth.establishmentId,
  });
  if (!campaign) {
    throw new CampaignMissingError(body.campaign);
  }

  const existingSender = await senderRepository.findOne({
    name: body.sender.name,
    establishmentId: auth.establishmentId,
  });
  const sender: SenderApi = createOrReplaceSender(
    body.sender,
    existingSender,
    auth.establishmentId
  );
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
  body('subject').isString().notEmpty().withMessage('subject is required'),
  body('body').isString().notEmpty().withMessage('body is required'),
  body('campaign')
    .isUUID()
    .withMessage('Must be an UUID')
    .notEmpty()
    .withMessage('campaign is required'),
  body('writtenAt')
    .isString()
    .withMessage('writtenAt must be a string')
    .trim()
    .isLength({ min: 10, max: 10 })
    .isISO8601({ strict: true, strictSeparator: true }),
  body('writtenFrom')
    .isString()
    .withMessage('writtenFrom must be a string')
    .trim()
    .notEmpty()
    .withMessage('writtenFrom is required'),
  body('sender').isObject().withMessage('Sender must be an object'),
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
    region: config.s3.endpoint,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });
  const logos = await async.map(draft.logo, async (logo: string) =>
    toBase64(logo, { s3, bucket: config.s3.bucket })
  );
  const signature = draft.sender.signatoryFile
    ? await toBase64(draft.sender.signatoryFile, {
        s3,
        bucket: config.s3.bucket,
      })
    : null;
  const html = await pdf.compile<DraftData>(DRAFT_TEMPLATE_FILE, {
    ...draft,
    sender: { ...draft.sender, signatoryFile: signature },
    logo: logos,
    watermark: true,
    body: replaceVariables(draft.body, {
      housing: body.housing,
      owner: body.owner,
    }),
    owner: {
      fullName: body.owner.fullName,
      rawAddress: body.owner.rawAddress.join(', '),
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
  body('owner.rawAddress').isArray().isLength({ min: 1 }),
];

async function update(request: Request, response: Response<DraftDTO>) {
  const { auth, params } = request as AuthenticatedRequest;
  const body = request.body as DraftUpdatePayloadDTO;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const changeSender = !!draft.sender && draft.sender.name !== body.sender.name;
  const existingSender: SenderApi | null = changeSender
    ? await senderRepository.findOne({
        name: body.sender.name,
        establishmentId: auth.establishmentId,
      })
    : draft.sender;

  const sender: SenderApi = createOrReplaceSender(
    body.sender,
    existingSender,
    auth.establishmentId
  );

  // If the sender exists, update it
  // Otherwise create a new sender
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
  body('subject').isString().notEmpty().withMessage('subject is required'),
  body('body').isString().notEmpty().withMessage('body is required'),
  body('writtenAt')
    .isString()
    .withMessage('writtenAt must be a string')
    .trim()
    .isLength({ min: 10, max: 10 })
    .isISO8601({ strict: true, strictSeparator: true }),
  body('writtenFrom')
    .isString()
    .withMessage('writtenFrom must be a string')
    .trim()
    .notEmpty()
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
