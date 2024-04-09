import express from 'express';
import * as jwt from 'jsonwebtoken';
import { MarkRequired } from 'ts-essentials';

import { TokenPayload, UserApi } from '../../server/models/UserApi';
import { EstablishmentApi } from '../../server/models/EstablishmentApi';

declare global {
  namespace Express {
    interface Request {
      auth?: jwt.JwtPayload & TokenPayload;
      establishment?: EstablishmentApi;
      user?: UserApi;
    }
  }
}

declare module 'express-jwt' {
  type AuthenticatedRequest = MarkRequired<
    express.Request,
    'auth' | 'establishment' | 'user'
  >;
}
