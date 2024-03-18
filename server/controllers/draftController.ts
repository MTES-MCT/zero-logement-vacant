import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { DraftApi, toDraftDTO } from '../models/DraftApi';
import draftRepository, { DraftFilters } from '../repositories/draftRepository';
import {
  DraftDTO,
  DraftCreationPayloadDTO,
} from '../../shared/models/DraftDTO';
import campaignDraftRepository from '../repositories/campaignDraftRepository';
import campaignRepository from '../repositories/campaignRepository';
import CampaignMissingError from '../errors/campaignMissingError';
import DraftMissingError from '../errors/draftMissingError';
import { isUUIDParam } from '../utils/validators';
import { logger } from '../utils/logger';
import pdf from '../utils/pdf';
import DRAFT_TEMPLATE_FILE from '../templates/draft';

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

  const draft: DraftApi = {
    id: uuidv4(),
    body: body.body,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    establishmentId: auth.establishmentId,
  };
  await draftRepository.save(draft);
  await campaignDraftRepository.save(campaign, draft);
  response.status(constants.HTTP_STATUS_CREATED).json(draft);
}
const createValidators: ValidationChain[] = [
  body('body').isString().notEmpty().withMessage('body is required'),
  body('campaign')
    .isUUID()
    .withMessage('Must be an UUID')
    .notEmpty()
    .withMessage('campaign is required'),
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
  });
  const finalPDF = await pdf.fromHTML(html);
  response.status(constants.HTTP_STATUS_OK).type('pdf').send(finalPDF);
}
const previewValidators: ValidationChain[] = [isUUIDParam('id')];

async function update(request: Request, response: Response<DraftDTO>) {
  const { auth, params } = request as AuthenticatedRequest;
  const body = request.body as DraftCreationPayloadDTO;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const updated: DraftApi = {
    ...draft,
    updatedAt: new Date().toJSON(),
    body: body.body,
  };
  await draftRepository.save(updated);
  logger.info('Draft updated', updated);

  response.status(constants.HTTP_STATUS_OK).json(toDraftDTO(updated));
}
const updateValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('body').isString().notEmpty().withMessage('body is required'),
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
