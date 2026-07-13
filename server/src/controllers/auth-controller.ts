import { constants } from 'http2';

import { UserAccountDTO, UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { fromNodeHeaders } from 'better-auth/node';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { object, string } from 'yup';

import AuthenticationMissingError from '~/errors/authenticationMissingError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import ForbiddenError from '~/errors/forbiddenError';
import ResetLinkExpiredError from '~/errors/resetLinkExpiredError';
import ResetLinkMissingError from '~/errors/resetLinkMissingError';
import UserMissingError from '~/errors/userMissingError';
import { auth } from '~/infra/auth';
import { logger } from '~/infra/logger';
import { hasExpired } from '~/models/ResetLinkApi';
import { SALT_LENGTH, toUserAccountDTO } from '~/models/UserApi';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';
import { updateUserAndAuth } from '~/services/authUserSyncService';

/**
 * Switches the active establishment stored in the Better Auth session.
 */
async function changeEstablishmentBySession(
  request: Request,
  response: Response
): Promise<void> {
  const cookieHeader = request.headers.cookie ?? '';
  if (!cookieHeader.includes('zlv.session_token')) {
    response.status(constants.HTTP_STATUS_METHOD_NOT_ALLOWED).json({
      message: 'POST requires a session cookie'
    });
    return;
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });
  if (!session) {
    throw new AuthenticationMissingError();
  }

  const { user } = request as AuthenticatedRequest;
  if (session.session.userId !== user.id) {
    logger.warn('Session user does not match authorised request user', {
      requestUserId: user.id,
      sessionUserId: session.session.userId
    });
    throw new ForbiddenError();
  }

  const establishmentId = request.params.establishmentId;

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.VISITOR) {
    const authorised =
      await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
    const authorisedIds = authorised
      .filter((establishment) => establishment.hasCommitment)
      .map((establishment) => establishment.establishmentId);
    if (!authorisedIds.includes(establishmentId)) {
      logger.warn('User tried to switch to unauthorised establishment', {
        userId: user.id,
        requestedEstablishment: establishmentId,
        authorisedEstablishments: authorisedIds
      });
      throw new ForbiddenError();
    }
  }

  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
  }

  const updateSession = await auth.api.updateSession({
    headers: fromNodeHeaders(request.headers),
    body: { activeEstablishmentId: establishmentId },
    returnHeaders: true
  } as Parameters<typeof auth.api.updateSession>[0] & {
    returnHeaders: true;
  });
  updateSession.headers.getSetCookie().forEach((cookie) => {
    response.append('Set-Cookie', cookie);
  });

  let effectiveGeoCodes: string[] | undefined;
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.VISITOR) {
    const userPerimeter = await userPerimeterRepository.get(
      user.id,
      establishment.id
    );
    effectiveGeoCodes = await filterGeoCodesByPerimeter(
      establishment.geoCodes,
      userPerimeter,
      establishment.siren
    );
  }

  response.status(constants.HTTP_STATUS_OK).json({
    establishment,
    effectiveGeoCodes
  });
}

async function get(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;

  logger.info('Get account', auth.userId);

  const user = await userRepository.get(auth.userId);
  if (!user) {
    throw new UserMissingError(auth.userId);
  }

  response.status(constants.HTTP_STATUS_OK).json(toUserAccountDTO(user));
}

const updateAccountSchema = object({
  firstName: string().strict(true).required(),
  lastName: string().strict(true).required(),
  phone: string().strict(true).required(),
  position: string().strict(true).required(),
  timePerWeek: string().strict(true).required()
});

const updateAccountValidators = {
  body: updateAccountSchema
};

/** @deprecated Use userController.update instead. */
async function updateAccount(request: Request, response: Response) {
  const { user } = request as AuthenticatedRequest;
  const account = request.body as UserAccountDTO;

  logger.info('Update account for ', user.id);

  await updateUserAndAuth({
    ...user,
    ...account,
    updatedAt: new Date().toJSON()
  });
  response.status(constants.HTTP_STATUS_OK).send();
}

const resetPasswordSchema = object({
  key: string()
    .required()
    .matches(/^[a-zA-Z0-9]+$/),
  password: string()
    .required()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .matches(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .matches(
      /[^A-Za-z0-9]/,
      'Le mot de passe doit contenir au moins un caractère spécial'
    )
});

const resetPasswordValidators = {
  body: resetPasswordSchema
};

async function resetPassword(request: Request, response: Response) {
  const { key, password } = request.body;

  const link = await resetLinkRepository.get(key);
  if (!link) {
    throw new ResetLinkMissingError();
  }

  if (hasExpired(link)) {
    throw new ResetLinkExpiredError();
  }

  const user = await userRepository.get(link.userId);
  if (!user) {
    throw new UserMissingError(link.userId);
  }

  const hash = await bcrypt.hash(password, SALT_LENGTH);
  await updateUserAndAuth(
    {
      ...user,
      password: hash,
      updatedAt: new Date().toJSON()
    },
    { passwordChanged: true }
  );
  const authContext = await auth.$context;
  await authContext.internalAdapter.deleteUserSessions(user.id);
  await resetLinkRepository.used(link.id);
  response.sendStatus(constants.HTTP_STATUS_OK);
}

export default {
  get,
  updateAccount,
  updateAccountSchema,
  updateAccountValidators,
  resetPassword,
  resetPasswordSchema,
  resetPasswordValidators,
  changeEstablishmentBySession
};
