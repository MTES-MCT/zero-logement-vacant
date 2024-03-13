import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { DraftApi } from '../models/DraftApi';
import draftRepository, { DraftFilters } from '../repositories/draftRepository';
import { DraftPayloadDTO } from '../../shared/models/DraftDTO';
import campaignDraftRepository from '../repositories/campaignDraftRepository';
import campaignRepository from '../repositories/campaignRepository';
import CampaignMissingError from '../errors/campaignMissingError';
import { body, ValidationChain } from 'express-validator';

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
  response.status(constants.HTTP_STATUS_OK).json(drafts);
}

async function create(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;
  const body = request.body as DraftPayloadDTO;

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

async function update(request: Request, response: Response) {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  await delay(1000);
  response.status(constants.HTTP_STATUS_OK).json();
}

const draftController = {
  list,
  create,
  createValidators,
};

export default draftController;
