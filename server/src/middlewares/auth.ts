import { UserRole } from '@zerologementvacant/models';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest, expressjwt } from 'express-jwt';
import memoize from 'memoizee';

import AuthenticationMissingError from '~/errors/authenticationMissingError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import establishmentRepository from '~/repositories/establishmentRepository';
import userRepository from '~/repositories/userRepository';

export const jwtCheck = (credentialsRequired: boolean) =>
  expressjwt({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    credentialsRequired,
    getToken: (request: Request) =>
      (request.headers['x-access-token'] ??
        request.query['x-access-token']) as string
  });

export const userCheck = () => {
  const getUser = memoize(userRepository.get, {
    promise: true,
    primitive: true
  });
  const getEstablishment = memoize(establishmentRepository.get, {
    promise: true,
    primitive: true
  });

  return async function (
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (!request.auth || !request.auth.userId) {
      throw new AuthenticationMissingError();
    }

    const [user, establishment] = await Promise.all([
      getUser(request.auth.userId),
      getEstablishment(request.auth.establishmentId)
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
    next();
  };
};

export function hasRole(roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    const { user } = request as AuthenticatedRequest;
    if (!roles.includes(user.role)) {
      throw new AuthenticationMissingError();
    }
    next();
  };
}
