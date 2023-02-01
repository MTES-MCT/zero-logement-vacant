import express from 'express';
import * as jwt from 'jsonwebtoken';
import { MarkRequired } from 'ts-essentials';

import { TokenPayload, UserApi } from '../../server/models/UserApi';

declare global {
  namespace Express {
    interface Request {
      auth?: jwt.JwtPayload & TokenPayload;
      user?: UserApi;
    }
  }
}

declare module 'express-jwt' {
  type AuthenticatedRequest = MarkRequired<express.Request, 'auth' | 'user'>;
}
