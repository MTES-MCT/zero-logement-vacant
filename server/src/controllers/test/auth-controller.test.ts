import { constants } from 'http2';
import { randomUUID } from 'node:crypto';

import { UserRole } from '@zerologementvacant/models';
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
import { createPasswordVerifier } from '~/infra/auth-password';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { toUserAccountDTO, UserApi } from '~/models/UserApi';
import ceremaService from '~/services/ceremaService';
import { factories } from '~/test/factories';
import { genResetLinkApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Account controller', () => {
  let url: string;
  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    url = await createServer().testing();
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  afterAll(async () => {
    await kysely.deleteFrom('session').where('userId', '=', user.id).execute();
    await kysely.deleteFrom('account').where('userId', '=', user.id).execute();
    await kysely.deleteFrom('authUsers').where('id', '=', user.id).execute();
    await kysely
      .deleteFrom('usersEstablishments')
      .where('userId', '=', user.id)
      .execute();
    await kysely
      .deleteFrom('resetLinks')
      .where('userId', '=', user.id)
      .execute();
    await kysely.deleteFrom('users').where('id', '=', user.id).execute();
    await kysely
      .deleteFrom('establishments')
      .where('id', '=', establishment.id)
      .execute();
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
    it('updates only the Better Auth credential password', async () => {
      const link = genResetLinkApi(user.id);
      await kysely.insertInto('resetLinks').values(link).execute();
      const newPassword = '123QWEasd!@#';

      await kysely
        .insertInto('authUsers')
        .values({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email.toLowerCase(),
          emailVerified: true
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
      await kysely
        .insertInto('account')
        .values({
          id: randomUUID(),
          accountId: user.email,
          providerId: 'credential',
          userId: user.id,
          password: user.password
        })
        .execute();
      const legacyPasswordBefore = (await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst())!.password;

      const { status } = await request(url)
        .post('/account/reset-password')
        .send({
          key: link.id,
          password: newPassword
        });

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const updatedUser = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      const updatedAccount = await kysely
        .selectFrom('account')
        .selectAll('account')
        .where('userId', '=', user.id)
        .where('providerId', '=', 'credential')
        .executeTakeFirst();
      expect(updatedUser!.password).toBe(legacyPasswordBefore);
      await expect(
        createPasswordVerifier({ rehash: null })({
          hash: updatedAccount!.password!,
          password: newPassword
        })
      ).resolves.toBeTrue();
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
      const usualUser = await factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.USUAL
      });
      const otherEstablishment = await factories.establishment.create();
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
        await kysely
          .deleteFrom('establishments')
          .where('id', '=', otherEstablishment.id)
          .execute();
        await kysely
          .deleteFrom('users')
          .where('id', '=', usualUser.id)
          .execute();
      }
    });

    it('rejects a stale establishment after Portail DF revokes access', async () => {
      const usualUser = await factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.USUAL
      });
      const targetEstablishment = await factories.establishment.create();
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: usualUser.id,
          establishmentId: targetEstablishment.id,
          establishmentSiren: targetEstablishment.siren,
          hasCommitment: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();
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
        await kysely
          .deleteFrom('usersEstablishments')
          .where('userId', '=', usualUser.id)
          .execute();
        await kysely
          .deleteFrom('establishments')
          .where('id', '=', targetEstablishment.id)
          .execute();
        await kysely
          .deleteFrom('users')
          .where('id', '=', usualUser.id)
          .execute();
      }
    });

    it('keeps the current session when Portail DF is unavailable', async () => {
      const usualUser = await factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.USUAL
      });
      const targetEstablishment = await factories.establishment.create();
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: usualUser.id,
          establishmentId: targetEstablishment.id,
          establishmentSiren: targetEstablishment.siren,
          hasCommitment: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();
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
        await kysely
          .deleteFrom('usersEstablishments')
          .where('userId', '=', usualUser.id)
          .execute();
        await kysely
          .deleteFrom('establishments')
          .where('id', '=', targetEstablishment.id)
          .execute();
        await kysely
          .deleteFrom('users')
          .where('id', '=', usualUser.id)
          .execute();
      }
    });

    it('rejects a switch when the request user differs from the session user', async () => {
      const [requestUser, sessionUser] = await Promise.all([
        factories.user.create({
          establishmentId: establishment.id,
          role: UserRole.USUAL
        }),
        factories.user.create({
          establishmentId: establishment.id,
          role: UserRole.USUAL
        })
      ]);
      const targetEstablishment = await factories.establishment.create();
      const now = new Date();
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: requestUser.id,
          establishmentId: targetEstablishment.id,
          establishmentSiren: targetEstablishment.siren,
          hasCommitment: true,
          createdAt: now,
          updatedAt: now
        })
        .execute();
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
        await kysely
          .deleteFrom('usersEstablishments')
          .where('userId', '=', requestUser.id)
          .execute();
        await kysely
          .deleteFrom('establishments')
          .where('id', '=', targetEstablishment.id)
          .execute();
        await kysely
          .deleteFrom('users')
          .where('id', 'in', [requestUser.id, sessionUser.id])
          .execute();
      }
    });

    it('updates the active establishment and returns no access token', async () => {
      const targetEstablishment = await factories.establishment.create();
      const usualUser = await factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.USUAL
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: usualUser.id,
          establishmentId: targetEstablishment.id,
          establishmentSiren: targetEstablishment.siren,
          hasCommitment: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

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
        const persistedUser = await kysely
          .selectFrom('users')
          .selectAll('users')
          .where('id', '=', usualUser.id)
          .executeTakeFirst();
        expect(persistedUser?.establishmentId).toBe(targetEstablishment.id);
      } finally {
        consultUsers.mockRestore();
        await kysely
          .deleteFrom('usersEstablishments')
          .where('userId', '=', usualUser.id)
          .execute();
        await kysely
          .deleteFrom('users')
          .where('id', '=', usualUser.id)
          .execute();
        await kysely
          .deleteFrom('establishments')
          .where('id', '=', targetEstablishment.id)
          .execute();
      }
    });

    it('allows an admin to switch to any establishment', async () => {
      const adminUser = await factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.ADMIN
      });
      const targetEstablishment = await factories.establishment.create();
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
        await kysely
          .deleteFrom('establishments')
          .where('id', '=', targetEstablishment.id)
          .execute();
        await kysely
          .deleteFrom('users')
          .where('id', '=', adminUser.id)
          .execute();
      }
    });
  });
});
