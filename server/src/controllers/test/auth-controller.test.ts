import { constants } from 'http2';
import { randomUUID } from 'node:crypto';

import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

vi.mock('../../services/ceremaService/mockCeremaService');
vi.mock('../../infra/auth', () => ({
  auth: {
    $context: Promise.resolve({
      internalAdapter: {
        deleteUserSessions: vi.fn()
      }
    }),
    api: {
      getSession: vi.fn(),
      updateSession: vi.fn()
    }
  }
}));

import { auth } from '~/infra/auth';
import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { SALT_LENGTH, toUserAccountDTO, UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatResetLinkApi,
  ResetLinks
} from '~/repositories/resetLinkRepository';
import { UsersEstablishments } from '~/repositories/user-establishment-repository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import ceremaService from '~/services/ceremaService';
import {
  genEstablishmentApi,
  genResetLinkApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Account controller', () => {
  let url: string;
  const establishment = genEstablishmentApi();
  const user: UserApi = genUserApi(establishment.id);

  beforeAll(async () => {
    url = await createServer().testing();
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(
      toUserDBO({
        ...user,
        password: bcrypt.hashSync(user.password, SALT_LENGTH)
      })
    );
  });

  afterAll(async () => {
    await db('session').where({ user_id: user.id }).delete();
    await db('account').where({ user_id: user.id }).delete();
    await db('auth_users').where({ id: user.id }).delete();
    await UsersEstablishments().where({ user_id: user.id }).delete();
    await ResetLinks().where({ user_id: user.id }).delete();
    await Users().where('id', user.id).delete();
    await Establishments().where('id', establishment.id).delete();
  });

  describe('GET /account', () => {
    it('rejects an unauthenticated request', async () => {
      await request(url)
        .get('/account')
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('returns the authenticated account', async () => {
      const { body, status } = await request(url)
        .get('/account')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(toUserAccountDTO(user));
    });
  });

  describe('POST /account/reset-password', () => {
    it('updates both the legacy and Better Auth password hashes', async () => {
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert(formatResetLinkApi(link));
      const newPassword = '123QWEasd!@#';

      await db('auth_users')
        .insert({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          email_verified: true,
          role: 'usual'
        })
        .onConflict('id')
        .ignore();
      await db('account').insert({
        id: randomUUID(),
        account_id: user.email,
        provider_id: 'credential',
        user_id: user.id,
        password: user.password
      });

      const { status } = await request(url)
        .post('/account/reset-password')
        .send({
          key: link.id,
          password: newPassword
        });

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const updatedUser = await Users().where('id', user.id).first();
      const updatedAccount = await db('account')
        .where({ user_id: user.id, provider_id: 'credential' })
        .first();
      expect(
        await bcrypt.compare(newPassword, updatedUser!.password)
      ).toBeTrue();
      expect(
        await bcrypt.compare(newPassword, updatedAccount.password)
      ).toBeTrue();
    });
  });

  describe('POST /account/establishments/:establishmentId', () => {
    const mockGetSession = vi.mocked(auth.api.getSession);
    const mockUpdateSession = vi.mocked(auth.api.updateSession);

    beforeEach(() => {
      mockGetSession.mockReset();
      mockUpdateSession.mockReset();
    });

    it('requires a session cookie', async () => {
      const { status } = await request(url)
        .post(`/account/establishments/${establishment.id}`)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_METHOD_NOT_ALLOWED);
    });

    it('rejects an establishment that is not authorised for a usual user', async () => {
      const usualUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      const otherEstablishment = genEstablishmentApi();
      await Users().insert(toUserDBO(usualUser));
      await Establishments().insert(formatEstablishmentApi(otherEstablishment));
      mockGetSession.mockResolvedValue({
        user: { id: usualUser.id },
        session: {
          id: 'session-forbidden',
          userId: usualUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);

      try {
        const { status } = await request(url)
          .post(`/account/establishments/${otherEstablishment.id}`)
          .set('Cookie', 'zlv.session_token=fake')
          .use(tokenProvider(usualUser));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
        expect(mockUpdateSession).not.toHaveBeenCalled();
      } finally {
        await Establishments().where('id', otherEstablishment.id).delete();
        await Users().where('id', usualUser.id).delete();
      }
    });

    it('rejects a stale establishment after Portail DF revokes access', async () => {
      const usualUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      const targetEstablishment = genEstablishmentApi();
      await Users().insert(toUserDBO(usualUser));
      await Establishments().insert(
        formatEstablishmentApi(targetEstablishment)
      );
      await UsersEstablishments().insert({
        user_id: usualUser.id,
        establishment_id: targetEstablishment.id,
        establishment_siren: targetEstablishment.siren,
        has_commitment: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      mockGetSession.mockResolvedValue({
        user: { id: usualUser.id },
        session: {
          id: 'session-stale-rights',
          userId: usualUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);
      const headers = new Headers();
      mockUpdateSession.mockResolvedValue({
        headers,
        response: { session: {} }
      } as any);
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockResolvedValue([]);

      try {
        const { status } = await request(url)
          .post(`/account/establishments/${targetEstablishment.id}`)
          .set('Cookie', 'zlv.session_token=fake')
          .use(tokenProvider(usualUser));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
        expect(mockUpdateSession).not.toHaveBeenCalled();
      } finally {
        consultUsers.mockRestore();
        await UsersEstablishments().where({ user_id: usualUser.id }).delete();
        await Establishments().where('id', targetEstablishment.id).delete();
        await Users().where('id', usualUser.id).delete();
      }
    });

    it('keeps the current session when Portail DF is unavailable', async () => {
      const usualUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      const targetEstablishment = genEstablishmentApi();
      await Users().insert(toUserDBO(usualUser));
      await Establishments().insert(
        formatEstablishmentApi(targetEstablishment)
      );
      await UsersEstablishments().insert({
        user_id: usualUser.id,
        establishment_id: targetEstablishment.id,
        establishment_siren: targetEstablishment.siren,
        has_commitment: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      mockGetSession.mockResolvedValue({
        user: { id: usualUser.id },
        session: {
          id: 'session-portail-unavailable',
          userId: usualUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);
      const headers = new Headers();
      mockUpdateSession.mockResolvedValue({
        headers,
        response: { session: {} }
      } as any);
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockRejectedValue(new Error('Portail DF unavailable'));

      try {
        const { status } = await request(url)
          .post(`/account/establishments/${targetEstablishment.id}`)
          .set('Cookie', 'zlv.session_token=fake')
          .use(tokenProvider(usualUser));

        expect(status).toBe(constants.HTTP_STATUS_SERVICE_UNAVAILABLE);
        expect(mockUpdateSession).not.toHaveBeenCalled();
      } finally {
        consultUsers.mockRestore();
        await UsersEstablishments().where({ user_id: usualUser.id }).delete();
        await Establishments().where('id', targetEstablishment.id).delete();
        await Users().where('id', usualUser.id).delete();
      }
    });

    it('rejects a switch when the request user differs from the session user', async () => {
      const requestUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      const sessionUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      const targetEstablishment = genEstablishmentApi();
      await Users().insert([requestUser, sessionUser].map(toUserDBO));
      await Establishments().insert(
        formatEstablishmentApi(targetEstablishment)
      );
      const now = new Date();
      await UsersEstablishments().insert({
        user_id: requestUser.id,
        establishment_id: targetEstablishment.id,
        establishment_siren: targetEstablishment.siren,
        has_commitment: true,
        created_at: now,
        updated_at: now
      });
      mockGetSession.mockResolvedValue({
        user: { id: sessionUser.id },
        session: {
          id: 'session-mismatch',
          userId: sessionUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);

      try {
        const { status } = await request(url)
          .post(`/account/establishments/${targetEstablishment.id}`)
          .set('Cookie', 'zlv.session_token=fake')
          .use(tokenProvider(requestUser));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
        expect(mockUpdateSession).not.toHaveBeenCalled();
      } finally {
        await UsersEstablishments().where({ user_id: requestUser.id }).delete();
        await Establishments().where('id', targetEstablishment.id).delete();
        await Users().whereIn('id', [requestUser.id, sessionUser.id]).delete();
      }
    });

    it('updates the active establishment and returns no access token', async () => {
      const targetEstablishment = genEstablishmentApi();
      const usualUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      await Establishments().insert(
        formatEstablishmentApi(targetEstablishment)
      );
      await Users().insert(toUserDBO(usualUser));
      await UsersEstablishments().insert({
        user_id: usualUser.id,
        establishment_id: targetEstablishment.id,
        establishment_siren: targetEstablishment.siren,
        has_commitment: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      mockGetSession.mockResolvedValue({
        user: { id: usualUser.id },
        session: {
          id: 'session-id',
          userId: usualUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);
      const headers = new Headers();
      headers.append(
        'set-cookie',
        'zlv.session_data=fresh; Path=/; HttpOnly; SameSite=Lax'
      );
      mockUpdateSession.mockResolvedValue({
        headers,
        response: { session: {} }
      } as any);
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockResolvedValue([
          {
            email: usualUser.email,
            establishmentSiren: targetEstablishment.siren,
            hasAccount: true,
            hasCommitment: true
          }
        ]);

      try {
        const response = await request(url)
          .post(`/account/establishments/${targetEstablishment.id}`)
          .set('Cookie', 'zlv.session_token=fake')
          .use(tokenProvider(usualUser));

        expect(response.status).toBe(constants.HTTP_STATUS_OK);
        expect(response.body).toMatchObject({
          establishment: { id: targetEstablishment.id }
        });
        expect(response.body).not.toHaveProperty('accessToken');
        expect(mockUpdateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            body: { activeEstablishmentId: targetEstablishment.id },
            returnHeaders: true
          })
        );
        const persistedUser = await Users().where({ id: usualUser.id }).first();
        expect(persistedUser?.establishment_id).toBe(targetEstablishment.id);
      } finally {
        consultUsers.mockRestore();
        await UsersEstablishments().where({ user_id: usualUser.id }).delete();
        await Users().where('id', usualUser.id).delete();
        await Establishments().where('id', targetEstablishment.id).delete();
      }
    });

    it('allows an admin to switch to any establishment', async () => {
      const adminUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.ADMIN
      };
      const targetEstablishment = genEstablishmentApi();
      await Users().insert(toUserDBO(adminUser));
      await Establishments().insert(
        formatEstablishmentApi(targetEstablishment)
      );
      mockGetSession.mockResolvedValue({
        user: { id: adminUser.id },
        session: {
          id: 'session-admin',
          userId: adminUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);
      const headers = new Headers();
      headers.append(
        'set-cookie',
        'zlv.session_data=fresh; Path=/; HttpOnly; SameSite=Strict'
      );
      mockUpdateSession.mockResolvedValue({
        headers,
        response: { session: {} }
      } as any);

      try {
        const { body, status } = await request(url)
          .post(`/account/establishments/${targetEstablishment.id}`)
          .set('Cookie', 'zlv.session_token=fake')
          .use(tokenProvider(adminUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject({
          establishment: { id: targetEstablishment.id }
        });
        expect(body.effectiveGeoCodes).toBeUndefined();
        expect(mockUpdateSession).toHaveBeenCalledOnce();
      } finally {
        await Establishments().where('id', targetEstablishment.id).delete();
        await Users().where('id', adminUser.id).delete();
      }
    });
  });
});
