import { addHours } from 'date-fns';
import { NextFunction, Request, Response } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import randomstring from 'randomstring';

import mailService from '../services/mailService';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import {
  hasExpired,
  RESET_LINK_EXPIRATION,
  RESET_LINK_LENGTH,
  ResetLinkApi,
} from '~/models/ResetLinkApi';
import userRepository from '~/repositories/userRepository';
import ResetLinkMissingError from '~/errors/resetLinkMissingError';
import ResetLinkExpiredError from '~/errors/resetLinkExpiredError';

async function create(request: Request, response: Response) {
  const { email } = request.body;
  const user = await userRepository.getByEmail(email);

  if (user) {
    const resetLink: ResetLinkApi = {
      id: randomstring.generate({
        charset: 'alphanumeric',
        length: RESET_LINK_LENGTH,
      }),
      userId: user.id,
      createdAt: new Date(),
      expiresAt: addHours(new Date(), RESET_LINK_EXPIRATION),
      usedAt: null,
    };
    await resetLinkRepository.insert(resetLink);
    await mailService.sendPasswordReset(resetLink.id, {
      recipients: [user.email],
    });
  }
  // Avoid returning the reset link in the body because it would compromise
  // the security of the password reset flow.
  response.status(constants.HTTP_STATUS_OK).send();
}
const createValidators: ValidationChain[] = [body('email').isEmail()];

async function show(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  const link = await resetLinkRepository.get(id);
  if (!link) {
    throw new ResetLinkMissingError();
  }

  if (hasExpired(link)) {
    throw new ResetLinkExpiredError();
  }

  response.status(constants.HTTP_STATUS_OK).json(link);
}
const showValidators: ValidationChain[] = [
  param('id').isString().notEmpty().isAlphanumeric(),
];

export default {
  create,
  createValidators,
  show,
  showValidators,
};
