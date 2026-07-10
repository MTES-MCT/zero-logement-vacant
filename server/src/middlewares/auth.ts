import { UserRole } from '@zerologementvacant/models';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';

import ForbiddenError from '~/errors/forbiddenError';

export function hasRole(roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    const { user } = request as AuthenticatedRequest;
    if (!roles.includes(user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}
