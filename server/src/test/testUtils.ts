import jwt from 'jsonwebtoken';
import { Plugin } from 'superagent';

import { TokenPayload, UserApi } from '~/models/UserApi';

export const createTestToken = (payload: TokenPayload) =>
  jwt.sign(payload, 'secret', { expiresIn: 86400 });

export function tokenProvider(user: UserApi): Plugin {
  return (request) => {
    request.set({
      'x-access-token': createTestToken({
        userId: user.id,
        establishmentId: user.establishmentId as string,
      }),
    });
  };
}
