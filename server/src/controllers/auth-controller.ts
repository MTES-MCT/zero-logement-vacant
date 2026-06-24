import { constants } from 'http2';

import { UserAccountDTO, UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { Request, Response, type RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import jwt from 'jsonwebtoken';
import { object, string } from 'yup';

import AuthenticationFailedError from '~/errors/authenticationFailedError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import ResetLinkExpiredError from '~/errors/resetLinkExpiredError';
import ResetLinkMissingError from '~/errors/resetLinkMissingError';
import UnprocessableEntityError from '~/errors/unprocessableEntityError';
import UserDeletedError from '~/errors/userDeletedError';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import { logger } from '~/infra/logger';
import type { EstablishmentApi } from '~/models/EstablishmentApi';
import { hasExpired } from '~/models/ResetLinkApi';
import type { SignInPayload } from '~/models/SignInPayload';
import {
  SALT_LENGTH,
  TokenPayload,
  toUserAccountDTO,
  toUserDTO,
  UserApi
} from '~/models/UserApi';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';
import ceremaService from '~/services/ceremaService';
import {
  verifyAccessRights,
  type AccessRightsError
} from '~/services/ceremaService/perimeterService';
import { getCeremaSuspensionState } from '~/services/ceremaService/suspensionService';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import mailService from '~/services/mailService';
import {
  generateSimpleCode,
  isCodeExpired,
  hashCode,
  verifyHashedCode,
  isAccountLocked,
  calculateLockoutEnd,
  MAX_FAILED_ATTEMPTS
} from '~/services/twoFactorService';

// TODO: remove get, updateAccount
// because they shall be implemented in userController

/**
 * Refresh authorized establishments for a user from Portail DF.
 * This is called at login to keep the users_establishments table in sync
 * with current Portail DF rights.
 *
 * Also verifies access rights (LOVAC access level + geographic perimeter)
 * and suspends user if rights are no longer valid.
 */
async function refreshAuthorizedEstablishments(
  user: UserApi,
  establishment: EstablishmentApi
): Promise<UserApi> {
  try {
    // Fetch current rights from Portail DF
    const ceremaUsers = await ceremaService.consultUsers(user.email);

    if (ceremaUsers.length === 0) {
      logger.info('No Portail DF rights found for user at login', {
        userId: user.id,
        email: user.email
      });
      return user;
    }

    const hasIncompleteCeremaDetails = ceremaUsers.some(
      (ceremaUser) =>
        ceremaUser.groupFetchFailed || ceremaUser.perimeterFetchFailed
    );
    if (hasIncompleteCeremaDetails) {
      logger.warn('Skipping Portail DF synchronization with incomplete details', {
        userId: user.id,
        email: user.email,
        failedEntries: ceremaUsers
          .filter(
            (ceremaUser) =>
              ceremaUser.groupFetchFailed || ceremaUser.perimeterFetchFailed
          )
          .map((ceremaUser) => ({
            establishmentSiren: ceremaUser.establishmentSiren,
            groupFetchFailed: ceremaUser.groupFetchFailed,
            perimeterFetchFailed: ceremaUser.perimeterFetchFailed
          }))
      });
      return user;
    }

    // Filter users with valid LOVAC commitment
    const ceremaUsersWithCommitment = ceremaUsers.filter(
      (cu) => cu.hasCommitment
    );
    const establishmentSirens = ceremaUsersWithCommitment.map(
      (cu) => cu.establishmentSiren
    );

    // Find all known establishments matching the SIRENs
    const knownEstablishments = await establishmentRepository.find({
      filters: { siren: establishmentSirens }
    });

    // Build authorized establishments list with access rights verification
    const authorizedEstablishments: Array<{
      establishmentId: string;
      establishmentSiren: string;
      hasCommitment: boolean;
    }> = [];

    const accessErrors: AccessRightsError[] = [];

    for (const est of knownEstablishments) {
      const ceremaUser = ceremaUsersWithCommitment.find(
        (cu) =>
          cu.establishmentSiren === est.siren || cu.establishmentSiren === '*'
      );

      if (ceremaUser) {
        // Verify access rights for this establishment (pass SIREN for EPCI perimeter check)
        const accessRights = await verifyAccessRights(
          ceremaUser,
          est.geoCodes,
          est.siren
        );

        if (accessRights.isValid) {
          authorizedEstablishments.push({
            establishmentId: est.id,
            establishmentSiren: est.siren,
            hasCommitment: ceremaUser.hasCommitment
          });

          if (ceremaUser.perimeter) {
            const perimeter = ceremaUser.perimeter;
            await userPerimeterRepository.upsert({
              userId: user.id,
              establishmentId: est.id,
              geoCodes: perimeter.comm || [],
              departments: perimeter.dep || [],
              regions: perimeter.reg || [],
              epci: perimeter.epci || [],
              frEntiere: perimeter.fr_entiere || false,
              updatedAt: new Date().toJSON()
            });

            logger.info('User perimeter saved from Portail DF', {
              userId: user.id,
              email: user.email,
              establishmentId: est.id,
              frEntiere: perimeter.fr_entiere,
              communesCount: perimeter.comm?.length || 0,
              departmentsCount: perimeter.dep?.length || 0,
              regionsCount: perimeter.reg?.length || 0,
              epciCount: perimeter.epci?.length || 0
            });
          }
        } else {
          logger.warn(
            'Access rights verification failed for establishment at login',
            {
              userId: user.id,
              email: user.email,
              establishmentId: est.id,
              establishmentSiren: est.siren,
              errors: accessRights.errors
            }
          );
          if (!user.establishmentId || est.id === user.establishmentId) {
            accessErrors.push(...accessRights.errors);
          }
        }
      }
    }

    let refreshedUser = user;
    const suspensionState = getCeremaSuspensionState(
      user,
      establishment,
      ceremaUsers,
      accessErrors
    );

    if (!suspensionState) {
      logger.info('No Portail DF entry found for current establishment', {
        userId: user.id,
        email: user.email,
        establishmentId: user.establishmentId,
        establishmentSiren: establishment.siren
      });
    } else if (
      user.suspendedAt !== suspensionState.suspendedAt ||
      user.suspendedCause !== suspensionState.suspendedCause
    ) {
      refreshedUser = {
        ...user,
        ...suspensionState
      };
      await userRepository.update(refreshedUser);

      logger.info('User suspension synchronized from Portail DF', {
        userId: user.id,
        email: user.email,
        previousSuspendedCause: user.suspendedCause,
        nextSuspendedCause: suspensionState.suspendedCause
      });
    }

    // Get current authorized establishments for comparison
    const currentAuthorized =
      await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
    const currentIds = new Set(currentAuthorized.map((e) => e.establishmentId));
    const newIds = new Set(
      authorizedEstablishments.map((e) => e.establishmentId)
    );

    // Check if there are changes
    const hasChanges =
      currentIds.size !== newIds.size ||
      [...currentIds].some((id) => !newIds.has(id)) ||
      [...newIds].some((id) => !currentIds.has(id));

    if (hasChanges) {
      logger.info('Updating authorized establishments for user at login', {
        userId: user.id,
        email: user.email,
        previousCount: currentAuthorized.length,
        newCount: authorizedEstablishments.length,
        previousIds: [...currentIds],
        newIds: [...newIds]
      });

      // Update authorized establishments
      await userEstablishmentRepository.setAuthorizedEstablishments(
        user.id,
        authorizedEstablishments
      );

      // Log multi-structure status
      const isMultiStructure =
        authorizedEstablishments.filter((e) => e.hasCommitment).length > 1;
      if (isMultiStructure) {
        logger.info('User identified as multi-structure at login', {
          userId: user.id,
          email: user.email,
          authorizedEstablishmentsCount: authorizedEstablishments.length
        });
      }
    } else {
      logger.debug('No changes to authorized establishments for user', {
        userId: user.id,
        email: user.email
      });
    }

    // User perimeters are saved per establishment while validating rights above.
    return refreshedUser;
  } catch (error) {
    // Log error but don't fail login
    logger.error('Failed to refresh authorized establishments at login', {
      userId: user.id,
      email: user.email,
      error
    });
    return user;
  }
}

const signIn: RequestHandler<never, unknown, SignInPayload, never> = async (
  request,
  response
): Promise<void> => {
  const payload = request.body;

  // Use getByEmailIncludingDeleted to be able to detect deleted users
  // and return a proper 403 error instead of 401
  const user = await userRepository.getByEmailIncludingDeleted(payload.email);
  if (!user) {
    throw new AuthenticationFailedError();
  }

  // Check if user account is deleted before password validation
  // to return proper 403 error for deleted accounts
  if (user.deletedAt) {
    logger.warn('Login attempt on deleted account', {
      userId: user.id,
      email: user.email,
      deletedAt: user.deletedAt
    });
    throw new UserDeletedError();
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationFailedError();
  }

  // Log suspended account login (but allow login - frontend will show modal)
  if (user.suspendedAt) {
    logger.info('Login on suspended account - modal will be displayed', {
      userId: user.id,
      email: user.email,
      suspendedAt: user.suspendedAt,
      suspendedCause: user.suspendedCause
    });
    // Note: We don't throw an error here anymore.
    // The login proceeds and the frontend displays the suspension modal
    // based on user.suspendedAt and user.suspendedCause
  }

  // Check if 2FA is required for admin users
  if (user.role === UserRole.ADMIN && config.auth.admin2faEnabled) {
    logger.info('Admin user detected, generating 2FA code', {
      userId: user.id
    });

    // Generate and send 2FA code
    const code = generateSimpleCode();
    const now = new Date();

    // Hash the code before storing
    const hashedCode = await hashCode(code);

    await userRepository.update({
      ...user,
      twoFactorCode: hashedCode,
      twoFactorCodeGeneratedAt: now.toJSON(),
      // Reset failed attempts on new code generation
      twoFactorFailedAttempts: 0,
      twoFactorLockedUntil: null
    });

    // Send code via email (plain text, only to user's email)
    await mailService.sendTwoFactorCode(code, {
      recipients: [user.email]
    });

    logger.info('2FA code sent to admin user', {
      userId: user.id,
      email: user.email,
      action: '2fa_code_sent'
    });

    // Return response indicating 2FA is required
    response.status(constants.HTTP_STATUS_OK).json({
      requiresTwoFactor: true,
      email: user.email
    });
    return;
  }

  // For non-admin users, proceed with normal login
  // Fetch and update user kind from Portail DF API
  const kind = await fetchUserKind(user.email);

  const updatedUser: UserApi = {
    ...user,
    kind,
    lastAuthenticatedAt: new Date().toJSON()
  };

  await userRepository.update(updatedUser);

  logger.info('User signed in', {
    userId: user.id,
    email: user.email,
    kind
  });

  const establishmentId =
    updatedUser.establishmentId ?? payload.establishmentId;
  if (!establishmentId) {
    throw new UnprocessableEntityError();
  }

  await signInToEstablishment(updatedUser, establishmentId, response);
};

async function signInToEstablishment(
  user: UserApi,
  establishmentId: string,
  response: Response
) {
  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
  }

  // Refresh authorized establishments and save perimeter from Portail DF at login
  // This MUST complete before returning the token to ensure perimeter filtering works
  const refreshedUser = await refreshAuthorizedEstablishments(
    user,
    establishment
  );

  // Get authorized establishments for multi-structure dropdown (after refresh)
  const authorizedEstablishmentLinks =
    await userEstablishmentRepository.getAuthorizedEstablishments(
      refreshedUser.id
    );
  const authorizedEstablishmentIds = authorizedEstablishmentLinks
    .filter((e) => e.hasCommitment)
    .map((e) => e.establishmentId);

  // Fetch full establishment details for authorized establishments
  let authorizedEstablishments: Awaited<
    ReturnType<typeof establishmentRepository.find>
  > = [];
  if (authorizedEstablishmentIds.length > 1) {
    authorizedEstablishments = await establishmentRepository.find({
      filters: { id: authorizedEstablishmentIds }
    });
  }

  // Compute effective geoCodes based on user's perimeter
  // ADMIN and VISITOR users have no restriction (effectiveGeoCodes = undefined)
  let effectiveGeoCodes: string[] | undefined;
  if (
    refreshedUser.role !== UserRole.ADMIN &&
    refreshedUser.role !== UserRole.VISITOR
  ) {
    const userPerimeter = await userPerimeterRepository.get(
      refreshedUser.id,
      establishment.id
    );
    effectiveGeoCodes = await filterGeoCodesByPerimeter(
      establishment.geoCodes,
      userPerimeter,
      establishment.siren
    );
  }

  const accessToken = jwt.sign(
    {
      userId: refreshedUser.id,
      establishmentId: establishment.id,
      role: refreshedUser.role
    } as TokenPayload,
    config.auth.secret,
    { expiresIn: config.auth.expiresIn }
  );

  response.status(constants.HTTP_STATUS_OK).json({
    user: toUserDTO(refreshedUser),
    establishment,
    accessToken,
    // Include authorized establishments for multi-structure users
    ...(authorizedEstablishments.length > 1 && { authorizedEstablishments }),
    // Include effective geoCodes for perimeter filtering (undefined = no restriction)
    effectiveGeoCodes
  });
}

async function changeEstablishment(request: Request, response: Response) {
  const { user } = request as AuthenticatedRequest;
  const establishmentId = request.params.establishmentId;

  // ADMIN and VISITOR can change to any establishment
  if (user.role === UserRole.ADMIN || user.role === UserRole.VISITOR) {
    await signInToEstablishment(user, establishmentId, response);
    return;
  }

  // USUAL users can only change to their authorized establishments
  const authorizedEstablishments =
    await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
  const authorizedIds = authorizedEstablishments
    .filter((e) => e.hasCommitment)
    .map((e) => e.establishmentId);

  if (!authorizedIds.includes(establishmentId)) {
    logger.warn('USUAL user tried to change to unauthorized establishment', {
      userId: user.id,
      email: user.email,
      requestedEstablishment: establishmentId,
      authorizedEstablishments: authorizedIds
    });
    throw new AuthenticationFailedError();
  }

  // Update user's current establishment
  const updatedUser = {
    ...user,
    establishmentId,
    updatedAt: new Date().toJSON()
  };
  await userRepository.update(updatedUser);

  await signInToEstablishment(updatedUser, establishmentId, response);
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

/**
 * @deprecated Use {@link userController.update} instead
 * @param request
 * @param response
 */
async function updateAccount(request: Request, response: Response) {
  const { user } = request as AuthenticatedRequest;
  const account = request.body as UserAccountDTO;

  logger.info('Update account for ', user.id);

  await userRepository.update({
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
  await userRepository.update({ ...user, password: hash });
  await resetLinkRepository.used(link.id);
  response.sendStatus(constants.HTTP_STATUS_OK);
}

const verifyTwoFactorSchema = object({
  email: string().required().email(),
  code: string()
    .required()
    .length(6)
    .matches(/^\d{6}$/),
  establishmentId: string().optional()
});

const verifyTwoFactorValidators = {
  body: verifyTwoFactorSchema
};

interface VerifyTwoFactorPayload {
  email: string;
  code: string;
  establishmentId?: string;
}

async function verifyTwoFactor(request: Request, response: Response) {
  const payload = request.body as VerifyTwoFactorPayload;

  const user = await userRepository.getByEmail(payload.email);
  if (!user) {
    logger.warn('2FA verification attempted for non-existent user', {
      email: payload.email,
      action: '2fa_verify_failed',
      reason: 'user_not_found'
    });
    throw new AuthenticationFailedError();
  }

  // Check if user is admin
  if (user.role !== UserRole.ADMIN) {
    logger.warn('2FA verification attempted by non-admin user', {
      userId: user.id,
      action: '2fa_verify_failed',
      reason: 'not_admin'
    });
    throw new AuthenticationFailedError();
  }

  // Check if account is locked
  if (
    isAccountLocked(
      user.twoFactorLockedUntil ? new Date(user.twoFactorLockedUntil) : null
    )
  ) {
    logger.warn('2FA verification attempted on locked account', {
      userId: user.id,
      lockedUntil: user.twoFactorLockedUntil,
      action: '2fa_verify_failed',
      reason: 'account_locked'
    });
    throw new AuthenticationFailedError();
  }

  // Check if code exists
  if (!user.twoFactorCode || !user.twoFactorCodeGeneratedAt) {
    logger.warn('2FA verification attempted without code', {
      userId: user.id,
      action: '2fa_verify_failed',
      reason: 'no_code'
    });
    throw new AuthenticationFailedError();
  }

  // Check if code has expired
  if (isCodeExpired(new Date(user.twoFactorCodeGeneratedAt))) {
    logger.warn('2FA code expired', {
      userId: user.id,
      generatedAt: user.twoFactorCodeGeneratedAt,
      action: '2fa_verify_failed',
      reason: 'expired'
    });
    throw new AuthenticationFailedError();
  }

  // Verify code against hashed version
  const isValidCode = await verifyHashedCode(payload.code, user.twoFactorCode);

  if (!isValidCode) {
    const failedAttempts = user.twoFactorFailedAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    logger.warn('2FA code mismatch', {
      userId: user.id,
      failedAttempts,
      shouldLock,
      action: '2fa_verify_failed',
      reason: 'invalid_code'
    });

    // Update failed attempts and lock if necessary
    await userRepository.update({
      ...user,
      twoFactorFailedAttempts: failedAttempts,
      twoFactorLockedUntil: shouldLock
        ? calculateLockoutEnd().toJSON()
        : user.twoFactorLockedUntil
    });

    throw new AuthenticationFailedError();
  }

  logger.info('2FA code verified successfully', {
    userId: user.id,
    email: user.email,
    action: '2fa_verify_success'
  });

  // Fetch and update user kind from Portail DF API
  const kind = await fetchUserKind(user.email);

  // Clear the 2FA code and reset counters
  const updatedUser: UserApi = {
    ...user,
    kind,
    twoFactorCode: null,
    twoFactorCodeGeneratedAt: null,
    twoFactorFailedAttempts: 0,
    twoFactorLockedUntil: null,
    lastAuthenticatedAt: new Date().toJSON()
  };

  await userRepository.update(updatedUser);

  logger.info('Admin user signed in after 2FA', {
    userId: user.id,
    email: user.email,
    kind
  });

  // Complete the sign-in process
  const establishmentId =
    updatedUser.establishmentId ?? payload.establishmentId;
  if (!establishmentId) {
    throw new UnprocessableEntityError();
  }

  await signInToEstablishment(updatedUser, establishmentId, response);
}

export default {
  signIn,
  verifyTwoFactor,
  verifyTwoFactorSchema,
  verifyTwoFactorValidators,
  get,
  updateAccount,
  updateAccountSchema,
  updateAccountValidators,
  resetPassword,
  resetPasswordSchema,
  resetPasswordValidators,
  changeEstablishment
};
