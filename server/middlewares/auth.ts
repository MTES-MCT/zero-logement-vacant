import { NextFunction, Request, Response } from 'express';
import { expressjwt } from 'express-jwt';
import memoize from 'memoizee';

import config from '../utils/config';
import userRepository from '../repositories/userRepository';
import UserMissingError from '../errors/userMissingError';
import AuthenticationMissingError from '../errors/authenticationMissingError';
import establishmentRepository from '../repositories/establishmentRepository';
import EstablishmentMissingError from '../errors/establishmentMissingError';

const getUser = memoize(userRepository.get, {
  promise: true,
  primitive: true,
});
const getEstablishment = memoize(establishmentRepository.get, {
  promise: true,
  primitive: true,
});

export const jwtCheck = (credentialsRequired: boolean) =>
  expressjwt({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    credentialsRequired,
    getToken: (request: Request) =>
      (request.headers['x-access-token'] ??
        request.query['x-access-token']) as string,
  });

export const userCheck = () =>
  async function (request: Request, response: Response, next: NextFunction) {
    if (!request.auth || !request.auth.userId) {
      throw new AuthenticationMissingError();
    }

    const [user, establishment] = await Promise.all([
      getUser(request.auth.userId),
      getEstablishment(request.auth.establishmentId),
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
