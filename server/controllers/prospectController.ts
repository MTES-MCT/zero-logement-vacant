import { param, ValidationChain } from 'express-validator';
import { Request, Response } from 'express';
import { constants } from 'http2';

import userRepository from '../repositories/userRepository';
import prospectRepository from '../repositories/prospectRepository';
import ProspectMissingError from '../errors/prospectMissingError';
import signupLinkRepository from '../repositories/signupLinkRepository';
import SignupLinkMissingError from '../errors/signupLinkMissingError';
import { hasExpired, SIGNUP_LINK_LENGTH } from '../models/SignupLinkApi';
import SignupLinkExpiredError from '../errors/signupLinkExpiredError';
import { ProspectApi } from '../models/ProspectApi';
import ceremaService from '../services/ceremaService';
import establishmentRepository from '../repositories/establishmentRepository';

async function upsert(request: Request, response: Response) {
  const id = request.params.id as string;
  console.log('Create prospect with link', id);

  const link = await signupLinkRepository.get(id);
  if (!link) {
    throw new SignupLinkMissingError(id);
  }
  if (hasExpired(link)) {
    throw new SignupLinkExpiredError();
  }

  const email = link.prospectEmail;
  const user = await userRepository.getByEmail(email);
  if (user) {
    console.log('Prospect is already a user for email', email);
    return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
  }

  const ceremaUser = await ceremaService.consultUser(email);
  const establishment = ceremaUser.establishmentSiren
    ? await establishmentRepository.findOne({
        siren: ceremaUser.establishmentSiren,
      })
    : null;
  const exists = await prospectRepository.exists(email);
  const prospect: ProspectApi = {
    email,
    establishment,
    hasAccount: ceremaUser.hasAccount,
    hasCommitment: ceremaUser.hasCommitment,
  };
  await prospectRepository.upsert(prospect);

  response
    .status(exists ? constants.HTTP_STATUS_OK : constants.HTTP_STATUS_CREATED)
    .json(prospect);
}

const createProspectValidator: ValidationChain[] = [
  param('id').isString().notEmpty().isAlphanumeric().isLength({
    min: SIGNUP_LINK_LENGTH,
    max: SIGNUP_LINK_LENGTH,
  }),
];

async function show(request: Request, response: Response) {
  const email = request.params.email as string;
  console.log('Get account', email);

  const prospect = await prospectRepository.get(email);
  if (!prospect) {
    throw new ProspectMissingError(email);
  }
  return response.status(constants.HTTP_STATUS_OK).json(prospect);
}

const showProspectValidator: ValidationChain[] = [
  param('email').notEmpty().isEmail(),
];

export default {
  upsert,
  createProspectValidator,
  show,
  showProspectValidator,
};
