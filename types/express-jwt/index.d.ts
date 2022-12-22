import { Request } from 'express-jwt';
import { RequestUser } from '../../server/models/UserApi';

declare module 'express-jwt' {
  type AuthenticatedRequest = Request<RequestUser>;
}
