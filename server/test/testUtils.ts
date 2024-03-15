import jwt from 'jsonwebtoken';
import { TokenPayload, UserApi } from '../models/UserApi';
import { Test } from 'supertest';
import { AdminUser1, User1 } from '../../database/seeds/test/003-users';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { Plugin } from 'superagent';

export const accessTokenTest = (payload: TokenPayload) =>
  jwt.sign(payload, 'secret', { expiresIn: 86400 });

export const adminAccessTokenTest = jwt.sign(
  {
    userId: AdminUser1.id,
    establishmentId: Establishment1.id,
    role: AdminUser1.role,
  } as TokenPayload,
  'secret',
  { expiresIn: 86400 }
);

export const withAccessToken = (test: Test, user: UserApi = User1) =>
  test.set(
    'x-access-token',
    accessTokenTest({
      userId: user.id,
      establishmentId: user.establishmentId as string,
    })
  );

export function tokenProvider(user: UserApi): Plugin {
  return (request) => {
    request.set({
      'x-access-token': accessTokenTest({
        userId: user.id,
        establishmentId: user.establishmentId as string,
      }),
    });
  };
}

export const withAdminAccessToken = (test: Test) =>
  test.set('x-access-token', adminAccessTokenTest);
