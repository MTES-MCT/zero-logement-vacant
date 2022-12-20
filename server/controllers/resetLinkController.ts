import { NextFunction, Request, Response } from 'express';
import { body, ValidationChain } from 'express-validator';
import mailService from '../services/mailService';
import resetLinkRepository from '../repositories/resetLinkRepository';
import { ResetLinkApi } from '../models/ResetLinkApi';
import { addHours } from 'date-fns';
import userRepository from '../repositories/userRepository';
import UserMissingError from '../errors/userMissingError';
import { constants } from 'http2';
import randomstring from 'randomstring';

/**
 * Expire in 24 hours.
 */
const LINK_EXPIRATION = 24;
/**
 * 100 characters id.
 */
const LINK_LENGTH = 100;

const create = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { email } = request.body;
    const user = await userRepository.getByEmail(email);
    if (!user) {
      throw new UserMissingError(email);
    }

    const resetLink: ResetLinkApi = {
      id: randomstring.generate({
        charset: 'alphanumeric',
        length: LINK_LENGTH,
      }),
      userId: user.id,
      createdAt: new Date(),
      expiresAt: addHours(new Date(), LINK_EXPIRATION),
      usedAt: null,
    };
    await resetLinkRepository.insert(resetLink);
    await mailService.sendPasswordReset(resetLink.id, {
      recipients: [user.email],
    });
    // Avoid returning the reset link in the body because it would compromise
    // the security of the password reset flow.
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
    // TODO
  } catch (error) {
    next(error);
  }
};

export default {
  create,
  createValidators,
  show,
};
