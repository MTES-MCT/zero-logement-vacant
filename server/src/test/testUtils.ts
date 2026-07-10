import jwt from 'jsonwebtoken';
import { Plugin } from 'superagent';

import {
  TEST_ESTABLISHMENT_ID_HEADER,
  TEST_USER_ID_HEADER
} from '~/middlewares/test-authentication';
import { TokenPayload, UserApi } from '~/models/UserApi';

export const createTestToken = (payload: TokenPayload) =>
  jwt.sign(payload, 'secret', { expiresIn: 86400 });

export function tokenProvider(user: UserApi): Plugin {
  return (request) => {
    request.set({
      [TEST_USER_ID_HEADER]: user.id,
      [TEST_ESTABLISHMENT_ID_HEADER]: user.establishmentId as string
    });
  };
}
