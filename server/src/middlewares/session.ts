import { UserRole } from '@zerologementvacant/models';
import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import memoize from 'memoizee';

import AuthenticationMissingError from '~/errors/authenticationMissingError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import UserMissingError from '~/errors/userMissingError';
import { auth } from '~/infra/auth';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';

interface CheckOptions {
  /**
   * @default true
   */
  required?: boolean;
}

/**
 * Cache results for 5 minutes
 */
const CACHE_MAX_AGE = 5 * 60 * 1000;

/**
 * Better-auth session-based replacement for {@link userCheck}.
 *
 * Reads the better-auth session from the incoming cookies, then loads the
 * user, the active establishment and the user perimeter, and augments the
 * request the same way {@link userCheck} does. Designed so the swap in
 * Task 7 is trivial.
 */
export function sessionCheck(options?: CheckOptions) {
  const getUser = memoize(userRepository.get, {
    promise: true,
    primitive: true,
    maxAge: CACHE_MAX_AGE
  });
  const getEstablishment = memoize(establishmentRepository.get, {
    promise: true,
    primitive: true,
    maxAge: CACHE_MAX_AGE
  });
  const getUserPerimeter = memoize(userPerimeterRepository.get, {
    promise: true,
    primitive: true,
    maxAge: CACHE_MAX_AGE
  });

  return async (request: Request, _: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers)
    });

    if (!session) {
      if (options?.required ?? true) {
        throw new AuthenticationMissingError();
      }
      return next();
    }

    const { session: sessionData } = session;
    const userId = (sessionData as any).userId as string;
    const establishmentId = (sessionData as any).activeEstablishmentId as
      | string
      | null;

    const [user, establishment, userPerimeter] = await Promise.all([
      getUser(userId),
      establishmentId
        ? getEstablishment(establishmentId)
        : Promise.resolve(null),
      getUserPerimeter(userId)
    ]);

    if (!user) {
      // Should never happen
      throw new UserMissingError(userId);
    }
    if (!establishment) {
      throw new EstablishmentMissingError(establishmentId ?? '');
    }

    request.user = user;
    request.establishment = establishment;
    request.userPerimeter = userPerimeter;
    // Transitional shim — controllers still read `request.auth.{userId,
    // establishmentId, role}` (populated by the legacy expressjwt middleware
    // on the JWT path). Mirror that shape here so controllers work
    // unchanged. Remove once all controllers migrate to `request.user` /
    // `request.establishment`.
    request.auth = {
      userId: user.id,
      establishmentId: establishment.id,
      role: user.role
    };
    // ADMIN and VISITOR bypass perimeter filtering entirely
    const isAdminOrVisitor = [UserRole.ADMIN, UserRole.VISITOR].includes(
      user.role
    );
    // undefined = no restriction; string[] = restricted
    request.effectiveGeoCodes = isAdminOrVisitor
      ? undefined
      : await filterGeoCodesByPerimeter(
          establishment.geoCodes,
          userPerimeter,
          establishment.siren
        );

    next();
  };
}
