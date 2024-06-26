import express from 'express';
import * as jwt from 'jsonwebtoken';
import { MarkRequired } from 'ts-essentials';

import { TokenPayload, UserApi } from '~/models/UserApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';

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
  type AuthenticatedRequest<
    PathParams extends Record<string, string> = Record<string, string>,
    ResponseBody = any,
    RequestBody = any,
    RequestQuery = any
  > = MarkRequired<
    express.Request<PathParams, ResponseBody, RequestBody, RequestQuery>,
    'auth' | 'establishment' | 'user'
  >;
}
