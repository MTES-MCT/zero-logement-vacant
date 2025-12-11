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
vi.mock('../services/mailService', () => ({
  default: {
    sendTwoFactorCode: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmail: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmailFromLovac: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn()
  }
}));

vi.mock('../services/ceremaService/mockCeremaService');

// Mock config to enable 2FA for tests
vi.mock('../infra/config', async () => {
  const actual = await vi.importActual('../infra/config');
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

import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { subDays } from 'date-fns';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';

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
import { formatUserApi, Users } from '~/repositories/userRepository';
import userRepository from '~/repositories/userRepository';

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
    await Users().insert(users.map(formatUserApi));
  });

  describe('Sign in', () => {
    const testRoute = '/api/authenticate';

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
      await Users().insert(formatUserApi(suspendedUser));

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
      await Users().insert(formatUserApi(deletedUser));

      const { status } = await request(url).post(testRoute).send({
        email: deletedUser.email,
        password: 'TestPassword123!'
      });

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);

      // Cleanup
      await Users().where('id', deletedUser.id).delete();
    });
  });

  describe('Verify 2FA', () => {
    const testRoute = '/api/authenticate/verify-2fa';

    beforeEach(async () => {
      // Trigger 2FA code generation
      // In test environment, the code will be TEST_2FA_CODE ('123456')
      await request(url).post('/api/authenticate').send({
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
    const testRoute = '/api/account';

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
    const testRoute = '/api/account';

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
    });
  });

  describe('Reset password', () => {
    const testRoute = '/api/account/reset-password';

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
    });
  });
});
