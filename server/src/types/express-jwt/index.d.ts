import express from 'express';
import * as jwt from 'jsonwebtoken';
import { MarkRequired } from 'ts-essentials';

import { TokenPayload, UserApi } from '~/models/UserApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserPerimeterApi } from '~/models/UserPerimeterApi';

declare global {
  namespace Express {
    interface Request {
      auth?: jwt.JwtPayload & TokenPayload;
      establishment?: EstablishmentApi;
      user?: UserApi;
      userPerimeter?: UserPerimeterApi | null;
      /**
       * GeoCodes filtered by user perimeter (intersection of establishment geoCodes and user perimeter).
       * Use this instead of establishment.geoCodes for filtering data.
       */
      effectiveGeoCodes?: string[];
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
    'auth' | 'establishment' | 'user' | 'effectiveGeoCodes'
  >;
}
