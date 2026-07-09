import { vi } from 'vitest';

// Fixed 2FA code used in test environment
// twoFactorService.generateSimpleCode() returns '123456' when NODE_ENV === 'test'
const TEST_2FA_CODE = '123456';

// Mock nodemailer to prevent actual email sending in tests
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
    }))
  }
}));

// Mock mailService to prevent actual email sending
vi.mock('../../services/mailService', () => ({
  default: {
    sendTwoFactorCode: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmail: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmailFromLovac: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn()
  }
}));

vi.mock('../../services/ceremaService/mockCeremaService');

// Mock posthogService — default: auth-v2 flag is OFF so existing tests
// exercise the legacy signIn path. Individual tests can flip it per-call
// via `mockResolvedValueOnce(true)`.
vi.mock('../../services/posthogService', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false),
  default: { isFeatureEnabled: vi.fn() }
}));

// Mock better-auth so we can simulate a session-cookie request without
// going through the full better-auth sign-in flow (covered by Task 10).
vi.mock('../../infra/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      updateSession: vi.fn()
    }
  }
}));

// Mock config to enable 2FA for tests
vi.mock('../../infra/config', async () => {
  const actual = await vi.importActual('../../infra/config');
  return {
    ...actual,
    default: {
      ...(actual as any).default,
      auth: {
        ...(actual as any).default.auth,
        admin2faEnabled: true
      }
    }
  };
});

import { constants } from 'http2';
import { randomUUID } from 'node:crypto';

import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { subDays } from 'date-fns';
import randomstring from 'randomstring';
import request from 'supertest';

import { auth } from '~/infra/auth';
import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { ResetLinkApi } from '~/models/ResetLinkApi';
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
import userRepository from '~/repositories/userRepository';
import { isFeatureEnabled } from '~/services/posthogService';
import {
  genEstablishmentApi,
  genNumber,
  genResetLinkApi,
  genUserAccountDTO,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Account controller', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const user: UserApi = genUserApi(establishment.id);
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    establishmentId: null,
    role: UserRole.ADMIN
  };

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    const users: UserApi[] = [user, admin].map((user) => ({
      ...user,
      password: bcrypt.hashSync(user.password, SALT_LENGTH)
    }));
    await Users().insert(users.map(toUserDBO));
  });

  describe('Sign in', () => {
    const testRoute = '/authenticate';

    it('should receive valid email and password', async () => {
      await request(url)
        .post(testRoute)
        .send({
          email: 'test',
          password: '123Valid'
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .post(testRoute)
        .send({
          email: 'test@test.test',
          password: '   '
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should fail if the user is missing', async () => {
      await request(url)
        .post(testRoute)
        .send({
          email: 'test@test.test',
          password: '123Valid'
        })
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should require 2FA when an admin tries to connect', async () => {
      const { body, status } = await request(url).post(testRoute).send({
        email: admin.email,
        password: admin.password
      });

      if (status !== constants.HTTP_STATUS_OK) {
        console.error('Unexpected status:', status);
        console.error('Response body:', body);
      }

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        requiresTwoFactor: true,
        email: admin.email
      });
    });

    it('should fail if the password is wrong', async () => {
      const { status } = await request(url).post(testRoute).send({
        email: user.email,
        password: '123ValidButWrong'
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should succeed', async () => {
      const { body, status } = await request(url).post(testRoute).send({
        email: user.email,
        password: user.password
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        establishment,
        accessToken: expect.any(String)
      });
    });

    it('should allow login for suspended user (modal will be displayed on frontend)', async () => {
      const suspendedUser: UserApi = {
        ...genUserApi(establishment.id),
        password: bcrypt.hashSync('TestPassword123!', SALT_LENGTH),
        suspendedAt: new Date().toJSON(),
        suspendedCause: 'droits utilisateur expires'
      };
      await Users().insert(toUserDBO(suspendedUser));

      const { body, status } = await request(url).post(testRoute).send({
        email: suspendedUser.email,
        password: 'TestPassword123!'
      });

      // Suspended users can login - the frontend will display the suspension modal
      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        establishment,
        accessToken: expect.any(String)
      });

      // Cleanup
      await Users().where('id', suspendedUser.id).delete();
    });

    it('should fail if the user is deleted', async () => {
      const deletedUser: UserApi = {
        ...genUserApi(establishment.id),
        password: bcrypt.hashSync('TestPassword123!', SALT_LENGTH),
        deletedAt: new Date().toJSON()
      };
      await Users().insert(toUserDBO(deletedUser));

      const { status } = await request(url).post(testRoute).send({
        email: deletedUser.email,
        password: 'TestPassword123!'
      });

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);

      // Cleanup
      await Users().where('id', deletedUser.id).delete();
    });
  });

  describe('POST /authenticate — auth-v2 flag', () => {
    const testRoute = '/authenticate';
    const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);

    afterEach(() => {
      mockIsFeatureEnabled.mockReset();
      // Restore default behaviour for the rest of the suite
      mockIsFeatureEnabled.mockResolvedValue(false);
    });

    it('returns 410 Gone when auth-v2 flag is enabled', async () => {
      mockIsFeatureEnabled.mockResolvedValueOnce(true);

      const { body, status } = await request(url).post(testRoute).send({
        email: user.email,
        password: user.password
      });

      expect(status).toBe(constants.HTTP_STATUS_GONE);
      expect(body).toMatchObject({ message: 'Use /auth/sign-in/email' });
    });

    it('keeps legacy 2FA sign-in available for admins when auth-v2 flag is enabled', async () => {
      mockIsFeatureEnabled.mockResolvedValueOnce(true);

      const { body, status } = await request(url).post(testRoute).send({
        email: admin.email,
        password: admin.password
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        requiresTwoFactor: true,
        email: admin.email
      });
    });

    it('proceeds normally when auth-v2 flag is disabled', async () => {
      mockIsFeatureEnabled.mockResolvedValueOnce(false);

      const { status } = await request(url).post(testRoute).send({
        email: user.email,
        password: 'WrongPassword123!'
      });

      // Reaches the legacy auth logic and fails with 401 (bogus password)
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });
  });

  describe('Verify 2FA', () => {
    const testRoute = '/authenticate/verify-2fa';

    beforeEach(async () => {
      // Trigger 2FA code generation
      // In test environment, the code will be TEST_2FA_CODE ('123456')
      await request(url).post('/authenticate').send({
        email: admin.email,
        password: admin.password
      });
    });

    it('should fail with invalid code', async () => {
      const { status } = await request(url).post(testRoute).send({
        email: admin.email,
        code: '000000',
        establishmentId: establishment.id
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail with non-admin user', async () => {
      const { status } = await request(url).post(testRoute).send({
        email: user.email,
        code: '123456',
        establishmentId: establishment.id
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should succeed with valid code', async () => {
      // Use the fixed test code
      const { body, status } = await request(url).post(testRoute).send({
        email: admin.email,
        code: TEST_2FA_CODE,
        establishmentId: establishment.id
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        establishment,
        accessToken: expect.any(String)
      });

      // Verify code was cleared and counters reset
      const updatedAdmin = await userRepository.getByEmail(admin.email);
      expect(updatedAdmin?.twoFactorCode).toBeNull();
      expect(updatedAdmin?.twoFactorCodeGeneratedAt).toBeNull();
      expect(updatedAdmin?.twoFactorFailedAttempts).toBe(0);
      expect(updatedAdmin?.twoFactorLockedUntil).toBeNull();
    });

    it('should lock account after 3 failed attempts', async () => {
      // First failed attempt
      await request(url).post(testRoute).send({
        email: admin.email,
        code: '000000',
        establishmentId: establishment.id
      });

      let adminUser = await userRepository.getByEmail(admin.email);
      expect(adminUser?.twoFactorFailedAttempts).toBe(1);
      expect(adminUser?.twoFactorLockedUntil).toBeNull();

      // Second failed attempt
      await request(url).post(testRoute).send({
        email: admin.email,
        code: '111111',
        establishmentId: establishment.id
      });

      adminUser = await userRepository.getByEmail(admin.email);
      expect(adminUser?.twoFactorFailedAttempts).toBe(2);
      expect(adminUser?.twoFactorLockedUntil).toBeNull();

      // Third failed attempt - should lock
      await request(url).post(testRoute).send({
        email: admin.email,
        code: '222222',
        establishmentId: establishment.id
      });

      adminUser = await userRepository.getByEmail(admin.email);
      expect(adminUser?.twoFactorFailedAttempts).toBe(3);
      expect(adminUser?.twoFactorLockedUntil).not.toBeNull();

      // Fourth attempt should fail due to lockout, even with correct code
      const { status } = await request(url).post(testRoute).send({
        email: admin.email,
        code: TEST_2FA_CODE, // Even with correct code
        establishmentId: establishment.id
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });
  });

  describe('Get account', () => {
    const testRoute = '/account';

    it('should be forbidden for a not authenticated user', async () => {
      await request(url)
        .get(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should retrieve the account', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(toUserAccountDTO(user));
    });
  });

  describe('Update account', () => {
    const testRoute = '/account';

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(url)
        .put(testRoute)
        .send(genUserAccountDTO);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should receive valid account', async () => {
      async function test(payload: Record<string, unknown>) {
        const { status } = await request(url)
          .put(testRoute)
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }

      await test({ ...genUserAccountDTO, firstName: genNumber() });
      await test({ ...genUserAccountDTO, lastName: genNumber() });
      await test({ ...genUserAccountDTO, phone: genNumber() });
      await test({ ...genUserAccountDTO, position: genNumber() });
      await test({ ...genUserAccountDTO, timePerWeek: genNumber() });
    });

    it('should succeed to change the account', async () => {
      const userAccountDTO = genUserAccountDTO;
      const { body, status } = await request(url)
        .put(testRoute)
        .send(userAccountDTO)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({});

      const actual = await Users().where('id', user.id).first();
      expect(actual).toMatchObject({
        first_name: userAccountDTO.firstName,
        last_name: userAccountDTO.lastName,
        phone: userAccountDTO.phone,
        position: userAccountDTO.position,
        time_per_week: userAccountDTO.timePerWeek
      });

      const authUser = await db('auth_users').where({ id: user.id }).first();
      expect(authUser).toMatchObject({
        first_name: userAccountDTO.firstName,
        last_name: userAccountDTO.lastName,
        phone: userAccountDTO.phone,
        position: userAccountDTO.position,
        time_per_week: userAccountDTO.timePerWeek
      });
    });
  });

  describe('Reset password', () => {
    const testRoute = '/account/reset-password';

    it('should receive valid key and password', async () => {
      await request(url)
        .post(testRoute)
        .send({
          key: '',
          password: '123QWEasd'
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric'
          }),
          password: '123'
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric'
          }),
          password: 'QWE'
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric'
          }),
          password: 'asd'
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be impossible if the reset link has expired', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(user.id),
        expiresAt: subDays(new Date(), 1)
      };
      await ResetLinks().insert(formatResetLinkApi(link));

      const { status } = await request(url).post(testRoute).send({
        key: link.id,
        password: '123QWEasd!@#'
      });

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it("should be impossible to change one's password without an existing reset link", async () => {
      const link = genResetLinkApi(user.id);

      const { status } = await request(url).post(testRoute).send({
        key: link.id,
        password: '123QWEasd!@#'
      });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should change password and use the reset link', async () => {
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert(formatResetLinkApi(link));
      const newPassword = '123QWEasd!@#';

      await db('account')
        .where({ user_id: user.id, provider_id: 'credential' })
        .delete();
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

      const { status } = await request(url).post(testRoute).send({
        key: link.id,
        password: newPassword
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualLink = await ResetLinks()
        .select()
        .where('id', link.id)
        .first();
      expect(actualLink?.used_at).toBeInstanceOf(Date);

      const actualUser = await Users()
        .select()
        .where('id', link.userId)
        .first();

      if (!actualUser) {
        expect.fail('User should exist');
        return;
      }
      const passwordsMatch = await bcrypt.compare(
        newPassword,
        actualUser.password
      );
      expect(passwordsMatch).toBeTrue();

      const actualAccount = await db('account')
        .where({ user_id: user.id, provider_id: 'credential' })
        .first();
      const accountPasswordMatches = await bcrypt.compare(
        newPassword,
        actualAccount.password
      );
      expect(accountPasswordMatches).toBeTrue();
    });
  });

  describe('POST /account/establishments/:establishmentId', () => {
    const mockGetSession = vi.mocked(auth.api.getSession);
    const mockUpdateSession = vi.mocked(auth.api.updateSession);

    beforeEach(() => {
      mockGetSession.mockReset();
      mockUpdateSession.mockReset();
    });

    it('should return 405 when posted without a session cookie', async () => {
      const usualUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      await Users().insert(toUserDBO(usualUser));

      const { status } = await request(url)
        .post(`/account/establishments/${establishment.id}`)
        .use(tokenProvider(usualUser));

      expect(status).toBe(constants.HTTP_STATUS_METHOD_NOT_ALLOWED);

      await Users().where('id', usualUser.id).delete();
    });

    it('should return 403 when a USUAL user requests an unauthorised establishment', async () => {
      const usualUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      await Users().insert(toUserDBO(usualUser));

      const otherEstablishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(otherEstablishment));

      mockGetSession.mockResolvedValue({
        user: { id: usualUser.id },
        session: {
          id: 'sess-forbidden',
          userId: usualUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);

      const { status } = await request(url)
        .post(`/account/establishments/${otherEstablishment.id}`)
        .set('Cookie', 'zlv.session_token=fake')
        .use(tokenProvider(usualUser));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      expect(mockUpdateSession).not.toHaveBeenCalled();

      await Establishments().where('id', otherEstablishment.id).delete();
      await Users().where('id', usualUser.id).delete();
    });

    it('should reject a session switch when the JWT user differs from the session user', async () => {
      const jwtUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      const sessionUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      await Users().insert([jwtUser, sessionUser].map(toUserDBO));

      const jwtOnlyEstablishment = genEstablishmentApi();
      await Establishments().insert(
        formatEstablishmentApi(jwtOnlyEstablishment)
      );

      const now = new Date();
      await UsersEstablishments().insert({
        user_id: jwtUser.id,
        establishment_id: jwtOnlyEstablishment.id,
        establishment_siren: jwtOnlyEstablishment.siren,
        has_commitment: true,
        created_at: now,
        updated_at: now
      });

      mockGetSession.mockResolvedValue({
        user: { id: sessionUser.id },
        session: {
          id: 'sess-mismatch',
          userId: sessionUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);

      const { status } = await request(url)
        .post(`/account/establishments/${jwtOnlyEstablishment.id}`)
        .set('Cookie', 'zlv.session_token=fake')
        .use(tokenProvider(jwtUser));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      expect(mockUpdateSession).not.toHaveBeenCalled();

      await UsersEstablishments().where({ user_id: jwtUser.id }).delete();
      await Establishments().where('id', jwtOnlyEstablishment.id).delete();
      await Users().whereIn('id', [jwtUser.id, sessionUser.id]).delete();
    });

    it('should return 200 and update the session for an authorised USUAL user', async () => {
      const usualUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };
      await Users().insert(toUserDBO(usualUser));

      const targetEstablishment = genEstablishmentApi();
      await Establishments().insert(
        formatEstablishmentApi(targetEstablishment)
      );

      const now = new Date();
      await UsersEstablishments().insert({
        user_id: usualUser.id,
        establishment_id: targetEstablishment.id,
        establishment_siren: targetEstablishment.siren,
        has_commitment: true,
        created_at: now,
        updated_at: now
      });

      mockGetSession.mockResolvedValue({
        user: { id: usualUser.id },
        session: {
          id: 'sess-ok',
          userId: usualUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);
      const updateSessionHeaders = new Headers();
      updateSessionHeaders.append(
        'set-cookie',
        'zlv.session_data=fresh; Path=/; HttpOnly; SameSite=Lax'
      );
      mockUpdateSession.mockResolvedValue({
        headers: updateSessionHeaders,
        response: { session: {} }
      } as any);

      const { body, headers, status } = await request(url)
        .post(`/account/establishments/${targetEstablishment.id}`)
        .set('Cookie', 'zlv.session_token=fake')
        .use(tokenProvider(usualUser));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        establishment: { id: targetEstablishment.id }
      });
      expect(body).not.toHaveProperty('accessToken');
      expect(mockUpdateSession).toHaveBeenCalledTimes(1);
      expect(mockUpdateSession).toHaveBeenCalledWith(
        expect.objectContaining({ returnHeaders: true })
      );
      expect(headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('zlv.session_data=fresh')
        ])
      );

      await UsersEstablishments().where({ user_id: usualUser.id }).delete();
      await Establishments().where('id', targetEstablishment.id).delete();
      await Users().where('id', usualUser.id).delete();
    });

    it('should return 200 for an ADMIN switching to any establishment', async () => {
      const adminUser: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.ADMIN
      };
      await Users().insert(toUserDBO(adminUser));

      const targetEstablishment = genEstablishmentApi();
      await Establishments().insert(
        formatEstablishmentApi(targetEstablishment)
      );

      mockGetSession.mockResolvedValue({
        user: { id: adminUser.id },
        session: {
          id: 'sess-admin',
          userId: adminUser.id,
          activeEstablishmentId: establishment.id
        }
      } as any);
      const updateSessionHeaders = new Headers();
      updateSessionHeaders.append(
        'set-cookie',
        'zlv.session_data=fresh; Path=/; HttpOnly; SameSite=Lax'
      );
      mockUpdateSession.mockResolvedValue({
        headers: updateSessionHeaders,
        response: { session: {} }
      } as any);

      const { body, status } = await request(url)
        .post(`/account/establishments/${targetEstablishment.id}`)
        .set('Cookie', 'zlv.session_token=fake')
        .use(tokenProvider(adminUser));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        establishment: { id: targetEstablishment.id }
      });
      expect(body.effectiveGeoCodes).toBeUndefined();
      expect(mockUpdateSession).toHaveBeenCalledTimes(1);

      await Establishments().where('id', targetEstablishment.id).delete();
      await Users().where('id', adminUser.id).delete();
    });
  });
});
