import { Request, Response } from 'express';
import { param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import ProspectMissingError from '~/errors/prospectMissingError';
import SignupLinkExpiredError from '~/errors/signupLinkExpiredError';
import SignupLinkMissingError from '~/errors/signupLinkMissingError';
import { logger } from '~/infra/logger';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { ProspectApi } from '~/models/ProspectApi';
import { hasExpired, SIGNUP_LINK_LENGTH } from '~/models/SignupLinkApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import prospectRepository from '~/repositories/prospectRepository';
import signupLinkRepository from '~/repositories/signupLinkRepository';

import userRepository from '~/repositories/userRepository';
import ceremaService from '~/services/ceremaService';

async function upsert(request: Request, response: Response) {
  const id = request.params.id as string;
  logger.info('Create prospect with link', id);

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
    logger.info('Prospect is already a user for email', email);
    response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
    return;
  }

  const ceremaUsers = await ceremaService.consultUsers(email);

  const knowEstablishmentWithCommitment: EstablishmentApi | undefined =
    await establishmentRepository
      .find({
        filters: {
          siren: ceremaUsers
            .filter((user) => user.hasCommitment)
            .map((ceremaUser) => ceremaUser.establishmentSiren)
        }
      })
      .then((_) => _[0]);

  const ceremaUser =
    ceremaUsers.find(
      (_) => _.establishmentSiren === knowEstablishmentWithCommitment?.siren
    ) ?? ceremaUsers[0];

  const exists = await prospectRepository.exists(email);

  const prospect: ProspectApi = {
    email,
    establishment: knowEstablishmentWithCommitment,
    hasAccount: ceremaUser?.hasAccount ?? false,
    hasCommitment: ceremaUser?.hasCommitment ?? false,
    lastAccountRequestAt: new Date()
  };
  await prospectRepository.upsert(prospect);

  const status = exists
    ? constants.HTTP_STATUS_OK
    : constants.HTTP_STATUS_CREATED;
  response.status(status).json(prospect);
}

const createProspectValidator: ValidationChain[] = [
  param('id').isString().notEmpty().isAlphanumeric().isLength({
    min: SIGNUP_LINK_LENGTH,
    max: SIGNUP_LINK_LENGTH
  })
];

async function show(request: Request, response: Response) {
  const email = request.params.email as string;
  logger.info('Get account', email);

  const prospect = await prospectRepository.get(email);
  if (!prospect) {
    throw new ProspectMissingError(email);
  }
  response.status(constants.HTTP_STATUS_OK).json(prospect);
}

const showProspectValidator: ValidationChain[] = [
  param('email').notEmpty().isEmail()
];

export default {
  upsert,
  createProspectValidator,
  show,
  showProspectValidator
};
