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
import DRAFT_TEMPLATE_FILE from '../templates/draft';
import { createOrReplaceSender, SenderApi } from '../models/SenderApi';
import senderRepository from '../repositories/senderRepository';
import ownerRepository from '../repositories/ownerRepository';
import housingRepository from '../repositories/housingRepository';

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

const senderValidators: ValidationChain[] = [
  ...['name', 'service', 'firstName', 'lastName', 'address'].map((prop) =>
    body(`sender.${prop}`)
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim()
      .notEmpty()
      .withMessage(`${prop} is required`)
  ),
  ...['email', 'phone'].map((prop) =>
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
    body: body.body,
    sender,
    senderId: sender.id,
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
  body('body').isString().notEmpty().withMessage('body is required'),
  body('campaign')
    .isUUID()
    .withMessage('Must be an UUID')
    .notEmpty()
    .withMessage('campaign is required'),
  body('sender').isObject().withMessage('Sender must be an object'),
  ...senderValidators,
];

async function preview(request: Request, response: Response) {
  const { auth, params } = request as AuthenticatedRequest;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const html = await pdf.compile(DRAFT_TEMPLATE_FILE, {
    body: draft.body,
    sender: draft.sender,
    owner: { fullName: 'NOM PRENOM', rawAdress: 'Adresse' }
  });
  const finalPDF = await pdf.fromHTML([ html ], 'draft');
  response.status(constants.HTTP_STATUS_OK).type('pdf').send(finalPDF);
}
const previewValidators: ValidationChain[] = [isUUIDParam('id')];

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
    body: body.body,
    sender,
    senderId: sender.id,
    updatedAt: new Date().toJSON(),
  };
  await senderRepository.save(sender);
  await draftRepository.save(updated);
  logger.info('Draft updated', updated);

  response.status(constants.HTTP_STATUS_OK).json(toDraftDTO(updated));
}
const updateValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('body').isString().notEmpty().withMessage('body is required'),
  body('sender').isObject().withMessage('Sender must be an object'),
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
