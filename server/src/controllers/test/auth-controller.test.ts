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

import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { subDays } from 'date-fns';
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
import { UsersEstablishments } from '~/repositories/user-establishment-repository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import userRepository from '~/repositories/userRepository';
import ceremaService from '~/services/ceremaService';
import type {
  CeremaGroup,
  CeremaPerimeter,
  CeremaUser
} from '~/services/ceremaService/consultUserService';
import {
  genEstablishmentApi,
  genNumber,
  genResetLinkApi,
  genUserAccountDTO,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

const lovacGroup: CeremaGroup = {
  id_groupe: 1,
  nom: 'LOVAC',
  structure: 1,
  perimetre: 1,
  niveau_acces: 'lovac',
  df_ano: false,
  df_non_ano: false,
  lovac: true
};

const frEntierePerimeter: CeremaPerimeter = {
  perimetre_id: 1,
  origine: 'test',
  fr_entiere: true,
  reg: [],
  dep: [],
  epci: [],
  comm: []
};

const unrelatedCommunePerimeter: CeremaPerimeter = {
  perimetre_id: 2,
  origine: 'test',
  fr_entiere: false,
  reg: [],
  dep: [],
  epci: [],
  comm: ['99999']
};

function genCeremaUser(
  overrides: Partial<CeremaUser> &
    Pick<CeremaUser, 'email' | 'establishmentSiren'>
): CeremaUser {
  return {
    hasAccount: true,
    hasCommitment: true,
    cguValide: '2026-03-11T12:36:01.255000+01:00',
    userExpiresAt: null,
    structureAccessExpiresAt: '2028-01-15T09:16:31+01:00',
    structureHasLovac: true,
    groupHasLovac: true,
    group: lovacGroup,
    perimeter: frEntierePerimeter,
    ...overrides
  };
}

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

    it('should replace an obsolete CGU suspension with the current Cerema structure expiration', async () => {
      const suspendedUser: UserApi = {
        ...genUserApi(establishment.id),
        password: bcrypt.hashSync('TestPassword123!', SALT_LENGTH),
        suspendedAt: new Date('2026-02-15T00:00:00.000Z').toJSON(),
        suspendedCause: 'cgu vides'
      };
      await Users().insert(toUserDBO(suspendedUser));
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockResolvedValue([
          {
            email: suspendedUser.email,
            establishmentSiren: establishment.siren,
            hasAccount: true,
            hasCommitment: false,
            cguValide: '2026-03-11T12:36:01.255000+01:00',
            userExpiresAt: null,
            structureAccessExpiresAt: '2025-01-15T09:16:31+01:00',
            structureHasLovac: false,
            groupHasLovac: true
          }
        ]);

      const { body, status } = await request(url).post(testRoute).send({
        email: suspendedUser.email,
        password: 'TestPassword123!'
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.user.suspendedCause).toBe('droits structure expires');
      const updatedUser = await userRepository.get(suspendedUser.id);
      expect(updatedUser?.suspendedAt).not.toBeNull();
      expect(updatedUser?.suspendedCause).toBe('droits structure expires');

      consultUsers.mockRestore();
      await Users().where('id', suspendedUser.id).delete();
    });

    it('should clear an obsolete Cerema suspension when current Cerema rights are valid', async () => {
      const suspendedUser: UserApi = {
        ...genUserApi(establishment.id),
        password: bcrypt.hashSync('TestPassword123!', SALT_LENGTH),
        suspendedAt: new Date('2026-02-15T00:00:00.000Z').toJSON(),
        suspendedCause: 'cgu vides'
      };
      await Users().insert(toUserDBO(suspendedUser));
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockResolvedValue([
          {
            email: suspendedUser.email,
            establishmentSiren: establishment.siren,
            hasAccount: true,
            hasCommitment: true,
            cguValide: '2026-03-11T12:36:01.255000+01:00',
            userExpiresAt: null,
            structureAccessExpiresAt: '2028-01-15T09:16:31+01:00',
            structureHasLovac: true,
            groupHasLovac: true
          }
        ]);

      const { body, status } = await request(url).post(testRoute).send({
        email: suspendedUser.email,
        password: 'TestPassword123!'
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.user.suspendedAt).toBeNull();
      expect(body.user.suspendedCause).toBeNull();
      const updatedUser = await userRepository.get(suspendedUser.id);
      expect(updatedUser?.suspendedAt).toBeNull();
      expect(updatedUser?.suspendedCause).toBeNull();

      consultUsers.mockRestore();
      await Users().where('id', suspendedUser.id).delete();
    });

    it('should not suspend the selected establishment with access errors from another establishment', async () => {
      const otherEstablishment = genEstablishmentApi('13055');
      const userWithoutCurrentEstablishment: UserApi = {
        ...genUserApi(establishment.id),
        establishmentId: null,
        password: bcrypt.hashSync('TestPassword123!', SALT_LENGTH)
      };
      await Establishments().insert(formatEstablishmentApi(otherEstablishment));
      await Users().insert(toUserDBO(userWithoutCurrentEstablishment));
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockResolvedValue([
          genCeremaUser({
            email: userWithoutCurrentEstablishment.email,
            establishmentSiren: establishment.siren
          }),
          genCeremaUser({
            email: userWithoutCurrentEstablishment.email,
            establishmentSiren: otherEstablishment.siren,
            perimeter: unrelatedCommunePerimeter
          })
        ]);

      const { body, status } = await request(url).post(testRoute).send({
        email: userWithoutCurrentEstablishment.email,
        password: 'TestPassword123!',
        establishmentId: establishment.id
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.user.suspendedAt).toBeNull();
      expect(body.user.suspendedCause).toBeNull();
      const updatedUser = await userRepository.get(
        userWithoutCurrentEstablishment.id
      );
      expect(updatedUser?.suspendedAt).toBeNull();
      expect(updatedUser?.suspendedCause).toBeNull();

      consultUsers.mockRestore();
      await Users().where('id', userWithoutCurrentEstablishment.id).delete();
      await Establishments().where('id', otherEstablishment.id).delete();
    });

    it('should keep the current suspension when Cerema details are incomplete', async () => {
      const suspendedAt = new Date('2026-02-15T00:00:00.000Z').toJSON();
      const suspendedUser: UserApi = {
        ...genUserApi(establishment.id),
        password: bcrypt.hashSync('TestPassword123!', SALT_LENGTH),
        suspendedAt,
        suspendedCause: 'cgu vides'
      };
      await Users().insert(toUserDBO(suspendedUser));
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockResolvedValue([
          {
            email: suspendedUser.email,
            establishmentSiren: establishment.siren,
            hasAccount: true,
            hasCommitment: false,
            cguValide: '2026-03-11T12:36:01.255000+01:00',
            userExpiresAt: null,
            structureAccessExpiresAt: '2028-01-15T09:16:31+01:00',
            structureHasLovac: true,
            groupHasLovac: undefined,
            groupFetchFailed: true
          }
        ]);

      const { body, status } = await request(url).post(testRoute).send({
        email: suspendedUser.email,
        password: 'TestPassword123!'
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.user.suspendedAt).toBe(suspendedAt);
      expect(body.user.suspendedCause).toBe('cgu vides');
      const updatedUser = await userRepository.get(suspendedUser.id);
      expect(updatedUser?.suspendedAt).toBe(suspendedAt);
      expect(updatedUser?.suspendedCause).toBe('cgu vides');

      consultUsers.mockRestore();
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

  describe('Change establishment', () => {
    it('should use the target establishment perimeter for multi-structure users', async () => {
      const sourceEstablishment = genEstablishmentApi();
      const targetEstablishment = genEstablishmentApi();
      const multiStructureUser: UserApi = {
        ...genUserApi(sourceEstablishment.id),
        role: UserRole.USUAL
      };
      await Establishments().insert(
        [sourceEstablishment, targetEstablishment].map(formatEstablishmentApi)
      );
      await Users().insert(toUserDBO(multiStructureUser));
      await UsersEstablishments().insert([
        {
          user_id: multiStructureUser.id,
          establishment_id: sourceEstablishment.id,
          establishment_siren: sourceEstablishment.siren,
          has_commitment: true
        },
        {
          user_id: multiStructureUser.id,
          establishment_id: targetEstablishment.id,
          establishment_siren: targetEstablishment.siren,
          has_commitment: true
        }
      ]);
      const consultUsers = vi
        .spyOn(ceremaService, 'consultUsers')
        .mockResolvedValue([
          {
            email: multiStructureUser.email,
            establishmentSiren: sourceEstablishment.siren,
            hasAccount: true,
            hasCommitment: true,
            perimeter: {
              perimetre_id: 1,
              origine: 'test',
              fr_entiere: false,
              reg: [],
              dep: [],
              epci: [sourceEstablishment.siren],
              comm: []
            }
          },
          {
            email: multiStructureUser.email,
            establishmentSiren: targetEstablishment.siren,
            hasAccount: true,
            hasCommitment: true,
            perimeter: {
              perimetre_id: 2,
              origine: 'test',
              fr_entiere: false,
              reg: [],
              dep: [],
              epci: [targetEstablishment.siren],
              comm: []
            }
          }
        ]);

      const { body, status } = await request(url)
        .get(`/account/establishments/${targetEstablishment.id}`)
        .use(tokenProvider(multiStructureUser));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.user.establishmentId).toBe(targetEstablishment.id);
      expect(body.effectiveGeoCodes).toBeUndefined();
      consultUsers.mockRestore();
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
