import { UserRole } from '@zerologementvacant/models';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest, expressjwt } from 'express-jwt';
import memoize from 'memoizee';

import AuthenticationMissingError from '~/errors/authenticationMissingError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import ForbiddenError from '~/errors/forbiddenError';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
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

export function jwtCheck(options?: CheckOptions) {
  return expressjwt({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    credentialsRequired: options?.required ?? true,
    getToken: (request: Request) =>
      (request.headers['x-access-token'] ??
        request.query['x-access-token']) as string
  });
}

export function userCheck(options?: CheckOptions) {
  const getUser = memoize(userRepository.get, {
    promise: true,
    primitive: true
  });
  const getEstablishment = memoize(establishmentRepository.get, {
    promise: true,
    primitive: true
  });
  const getUserPerimeter = memoize(userPerimeterRepository.get, {
    promise: true,
    primitive: true
  });

  return async (request: Request, _: Response, next: NextFunction) => {
    if (!request.auth || !request.auth.userId) {
      if (options?.required) {
        throw new AuthenticationMissingError();
      }
      return next();
    }

    const [user, establishment, userPerimeter] = await Promise.all([
      getUser(request.auth.userId),
      getEstablishment(request.auth.establishmentId),
      getUserPerimeter(request.auth.userId)
    ]);
    if (!user) {
      // Should never happen
      throw new UserMissingError(request.auth.userId);
    }

    if (!establishment) {
      throw new EstablishmentMissingError(request.auth.establishmentId);
    }

    request.user = user;
    request.establishment = establishment;
    request.userPerimeter = userPerimeter;
    // Compute filtered geoCodes based on user perimeter
    // Pass establishment SIREN for EPCI perimeter check
    request.effectiveGeoCodes = filterGeoCodesByPerimeter(
      establishment.geoCodes,
      userPerimeter,
      establishment.siren
    );
    next();
  };
}

export function hasRole(roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    const { user } = request as AuthenticatedRequest;
    if (!roles.includes(user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}
