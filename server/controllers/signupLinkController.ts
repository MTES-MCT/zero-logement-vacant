import { Request, Response } from 'express';
import {
  getAccountActivationLink,
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
import userRepository from '../repositories/userRepository';

async function create(request: Request, response: Response) {
  const { email } = request.body;

  const user = await userRepository.getByEmail(email);
  if (user) {
    // Return a success code to avoid giving information to an attacker
    // that an account already exists with the given email
    response.sendStatus(constants.HTTP_STATUS_CREATED);
    return;
  }

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
  mailService.emit('prospect:initialized', email, {
    link: getAccountActivationLink(link.id),
  });
  response.sendStatus(constants.HTTP_STATUS_CREATED);
}

const createValidators: ValidationChain[] = [body('email').isEmail()];

async function show(request: Request, response: Response) {
  const { id } = request.params;
  const link = await signupLinkRepository.get(id);
  if (!link) {
    throw new SignupLinkMissingError(id);
  }
  if (hasExpired(link)) {
    throw new SignupLinkExpiredError();
  }

  response.status(constants.HTTP_STATUS_OK).json(link);
}

const showValidators: ValidationChain[] = [param('id').isString().notEmpty()];

const signupLinkController = {
  create,
  createValidators,
  show,
  showValidators,
};

export default signupLinkController;
