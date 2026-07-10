import { UserRole } from '@zerologementvacant/models';
import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';

import AuthenticationMissingError from '~/errors/authenticationMissingError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import UserMissingError from '~/errors/userMissingError';
import { auth } from '~/infra/auth';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';

import { readTestAuthentication } from './test-authentication';

interface CheckOptions {
  /**
   * @default true
   */
  required?: boolean;
}

/** Loads the Better Auth session and its current ZLV authorization context. */
export function sessionCheck(options?: CheckOptions) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const testAuthentication = readTestAuthentication(request);
    const sessionResult = testAuthentication
      ? null
      : await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
          returnHeaders: true
        });
    // getSession slides the idle expiry and may refresh Better Auth's cookie
    // cache. Forward every cookie so the browser and database expirations stay
    // aligned during continuous protected activity.
    sessionResult?.headers.getSetCookie().forEach((cookie) => {
      response.append('Set-Cookie', cookie);
    });
    const sessionData = testAuthentication ?? sessionResult?.response?.session;

    if (!sessionData) {
      if (options?.required ?? true) {
        throw new AuthenticationMissingError();
      }
      return next();
    }

    const userId = (sessionData as any).userId as string;
    const establishmentId = (sessionData as any).activeEstablishmentId as
      | string
      | null;

    // Fetch fresh on every request — no caching. A suspended user, a revoked
    // role or a removed establishment must take effect immediately, not after
    // a cache window. (better-auth's 60s session cookieCache already bounds how
    // stale the session row itself can be.)
    const [user, establishment, userPerimeter] = await Promise.all([
      userRepository.get(userId),
      establishmentId
        ? establishmentRepository.get(establishmentId)
        : Promise.resolve(null),
      establishmentId
        ? userPerimeterRepository.get(userId, establishmentId)
        : Promise.resolve(null)
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
    // Compatibility shim for controllers that still read
    // `request.auth.{userId, establishmentId, role}`.
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
