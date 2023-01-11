import { Request, Response } from 'express';
import {
  hasExpired,
  SIGNUP_LINK_EXPIRATION,
  SIGNUP_LINK_LENGTH,
  SignupLinkApi,
} from '../models/SignupLinkApi';
import randomstring from 'randomstring';
import { addHours } from 'date-fns';
import mailService from '../services/mailService';
import signupLinkRepository from '../repositories/signupLinkRepository';
import { body, param, ValidationChain } from 'express-validator';
import SignupLinkMissingError from '../errors/signupLinkMissingError';
import { constants } from 'http2';
import SignupLinkExpiredError from '../errors/signupLinkExpiredError';

const create = async (request: Request, response: Response) => {
  const { email } = request.body;

  const link: SignupLinkApi = {
    id: randomstring.generate({
      charset: 'alphanumeric',
      length: SIGNUP_LINK_LENGTH,
    }),
    prospectEmail: email,
    expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION),
  };
  await signupLinkRepository.insert(link);
  await mailService.sendAccountActivationEmail(link.id, {
    recipients: [email],
  });
  response.sendStatus(constants.HTTP_STATUS_CREATED);
};

const createValidators: ValidationChain[] = [body('email').isEmail()];

const show = async (request: Request, response: Response) => {
  const { id } = request.params;
  const link = await signupLinkRepository.get(id);
  if (!link) {
    throw new SignupLinkMissingError(id);
  }
  if (hasExpired(link)) {
    throw new SignupLinkExpiredError();
  }

  response.status(constants.HTTP_STATUS_OK).json(link);
};

const showValidators: ValidationChain[] = [param('id').isString().notEmpty()];

const signupLinkController = {
  create,
  createValidators,
  show,
  showValidators,
};

export default signupLinkController;
