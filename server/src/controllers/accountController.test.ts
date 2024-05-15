import bcrypt from 'bcryptjs';
import { subDays } from 'date-fns';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';

import {
  genEstablishmentApi,
  genNumber,
  genResetLinkApi,
  genUserAccountDTO,
  genUserApi,
} from '~/test/testFixtures';
import {
  formatResetLinkApi,
  ResetLinks,
} from '~/repositories/resetLinkRepository';
import { ResetLinkApi } from '~/models/ResetLinkApi';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { createServer } from '~/infra/server';
import { tokenProvider } from '~/test/testUtils';
import {
  SALT_LENGTH,
  toUserAccountDTO,
  UserApi,
  UserRoles,
} from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';

jest.mock('../services/ceremaService/mockCeremaService');

const { app } = createServer();

describe('Account controller', () => {
  const establishment = genEstablishmentApi();
  const user: UserApi = genUserApi(establishment.id);
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    establishmentId: undefined,
    role: UserRoles.Admin,
  };

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    const users: UserApi[] = [user, admin].map((user) => ({
      ...user,
      password: bcrypt.hashSync(user.password, SALT_LENGTH),
    }));
    await Users().insert(users.map(formatUserApi));
  });

  describe('Sign in', () => {
    const testRoute = '/api/authenticate';

    it('should receive valid email and password', async () => {
      await request(app)
        .post(testRoute)
        .send({
          email: 'test',
          password: '123Valid',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          email: 'test@test.test',
          password: '   ',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should fail if the user is missing', async () => {
      await request(app)
        .post(testRoute)
        .send({
          email: 'test@test.test',
          password: '123Valid',
        })
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if an admin tries to connect as a user', async () => {
      const { body, status } = await request(app).post(testRoute).send({
        email: admin.email,
        password: admin.password,
      });

      expect(status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
      expect(body).toStrictEqual({
        name: 'UnprocessableEntityError',
        message: 'Unprocessable entity',
      });
    });

    it('should fail if the password is wrong', async () => {
      const { status } = await request(app).post(testRoute).send({
        email: user.email,
        password: '123ValidButWrong',
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should succeed', async () => {
      const { body, status } = await request(app).post(testRoute).send({
        email: user.email,
        password: user.password,
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        establishment,
        accessToken: expect.any(String),
      });
    });
  });

  describe('Get account', () => {
    const testRoute = '/api/account';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should retrieve the account', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(toUserAccountDTO(user));
    });
  });

  describe('Update account', () => {
    const testRoute = '/api/account';

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(app)
        .put(testRoute)
        .send(genUserAccountDTO);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should receive valid account', async () => {
      async function test(payload: Record<string, unknown>) {
        const { status } = await request(app)
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
      const { body, status } = await request(app)
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
        time_per_week: userAccountDTO.timePerWeek,
      });
    });
  });

  describe('Update password', () => {
    const testRoute = '/api/account/password';

    it('should receive valid current and new passwords', async () => {
      async function test(payload: Record<string, unknown>) {
        const { status } = await request(app)
          .put(testRoute)
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }

      await test({ currentPassword: '', newPassword: '123QWEasd' });
      await test({ currentPassword: '     ', newPassword: '123QWEasd' });
      await test({ currentPassword: user.password, newPassword: '' });
      await test({ currentPassword: user.password, newPassword: '    ' });
    });

    it('should fail if the current password and the given one are different', async () => {
      const { status } = await request(app)
        .put(testRoute)
        .send({
          currentPassword: 'NotTheirCurrentPassword',
          newPassword: '123QWEasd',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should succeed to change the password', async () => {
      const { body, status } = await request(app)
        .put(testRoute)
        .send({
          currentPassword: user.password,
          newPassword: '123QWEasd',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({});
    });
  });

  describe('Reset password', () => {
    const testRoute = '/api/account/reset-password';

    it('should receive valid key and password', async () => {
      await request(app)
        .post(testRoute)
        .send({
          key: '',
          password: '123QWEasd',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric',
          }),
          password: '123',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric',
          }),
          password: 'QWE',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric',
          }),
          password: 'asd',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be impossible if the reset link has expired', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(user.id),
        expiresAt: subDays(new Date(), 1),
      };
      await ResetLinks().insert(formatResetLinkApi(link));

      const { status } = await request(app).post(testRoute).send({
        key: link.id,
        password: '123QWEasd',
      });

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it("should be impossible to change one's password without an existing reset link", async () => {
      const link = genResetLinkApi(user.id);

      const { status } = await request(app).post(testRoute).send({
        key: link.id,
        password: '123QWEasd',
      });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should change password and use the reset link', async () => {
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert(formatResetLinkApi(link));
      const newPassword = '123QWEasd';

      const { status } = await request(app).post(testRoute).send({
        key: link.id,
        password: newPassword,
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
        actualUser.password,
      );
      expect(passwordsMatch).toBeTrue();
    });
  });
});
