import { NextFunction, Request, Response } from 'express';
import {
  SIGNUP_LINK_EXPIRATION,
  SIGNUP_LINK_LENGTH,
  SignupLinkApi,
} from '../models/SignupLinkApi';
import randomstring from 'randomstring';
import { addHours } from 'date-fns';
import mailService from '../services/mailService';
import signupLinkRepository from '../repositories/signupLinkRepository';
import { body, param, ValidationChain } from 'express-validator';
import prospectRepository from '../repositories/prospectRepository';
import ProspectMissingError from '../errors/prospectMissingError';
import { isValid } from '../models/ProspectApi';
import ProspectInvalidError from '../errors/prospectInvalidError';
import SignupLinkMissingError from '../errors/signupLinkMissingError';
import { constants } from 'http2';

const create = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { email } = request.body;

    const prospect = await prospectRepository.get(email);
    if (!prospect) {
      throw new ProspectMissingError(email);
    }

    if (!isValid(prospect)) {
      throw new ProspectInvalidError(prospect);
    }

    const link: SignupLinkApi = {
      id: randomstring.generate({
        charset: 'alphanumeric',
        length: SIGNUP_LINK_LENGTH,
      }),
      prospectEmail: prospect.email,
      expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION),
    };
    await signupLinkRepository.insert(link);
    await mailService.sendAccountActivationEmail(link.id, {
      recipients: [prospect.email],
    });
    response.sendStatus(constants.HTTP_STATUS_CREATED);
  } catch (error) {
    next(error);
  }
};
const createValidators: ValidationChain[] = [body('email').isEmail()];

const show = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { id } = request.params;
    const link = await signupLinkRepository.get(id);
    if (!link) {
      throw new SignupLinkMissingError(id);
    }

    response.status(constants.HTTP_STATUS_OK).json(link);
  } catch (error) {
    next(error);
  }
};
const showValidators: ValidationChain[] = [param('id').isString().notEmpty()];

const signupLinkController = {
  create,
  createValidators,
  show,
  showValidators,
};

export default signupLinkController;
