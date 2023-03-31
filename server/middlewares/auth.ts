import { NextFunction, Request, Response } from 'express';
import { expressjwt } from 'express-jwt';

import config from '../utils/config';
import userRepository from '../repositories/userRepository';
import UserMissingError from '../errors/userMissingError';
import AuthenticationMissingError from '../errors/authenticationMissingError';
import establishmentRepository from '../repositories/establishmentRepository';
import EstablishmentMissingError from '../errors/establishmentMissingError';

export const jwtCheck = (credentialsRequired: boolean) =>
  expressjwt({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    credentialsRequired,
    getToken: (request: Request) =>
      (request.headers['x-access-token'] ??
        request.query['x-access-token']) as string,
  });

export const userCheck = (credentialsRequired: boolean) =>
  async function (request: Request, response: Response, next: NextFunction) {
    if (credentialsRequired) {
      if (!request.auth || !request.auth.userId) {
        throw new AuthenticationMissingError();
      }

      const [user, establishment] = await Promise.all([
        userRepository.get(request.auth.userId),
        establishmentRepository.get(request.auth.establishmentId),
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
    } else {
      if (request.auth) {
        request.user =
          (await userRepository.get(request.auth.userId)) ?? undefined;
        request.establishment =
          (await establishmentRepository.get(request.auth.establishmentId)) ??
          undefined;
      }
    }
    next();
  };
