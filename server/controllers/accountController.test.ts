import request from 'supertest';
import randomstring from 'randomstring';
import { constants } from 'http2';
import { AdminUser1, User1 } from '../../database/seeds/test/003-users';
import {
  genNumber,
  genResetLinkApi,
  genUserAccountDTO,
} from '../test/testFixtures';
import fetchMock from 'jest-fetch-mock';
import db from '../repositories/db';
import {
  formatResetLinkApi,
  resetLinkTable,
} from '../repositories/resetLinkRepository';
import { ResetLinkApi } from '../models/ResetLinkApi';
import { subDays } from 'date-fns';
import { usersTable } from '../repositories/userRepository';
import bcrypt from 'bcryptjs';
import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { toUserAccountDTO } from '../models/UserApi';

jest.mock('../services/ceremaService/mockCeremaService');

const { app } = createServer();

beforeEach(() => {
  fetchMock.resetMocks();
});

describe('Account controller', () => {
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
        email: AdminUser1.email,
        password: AdminUser1.password,
      });

      expect(status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
      expect(body).toStrictEqual({
        name: 'UnprocessableEntityError',
        message: 'Unprocessable entity',
      });
    });

    it('should fail if the password is wrong', async () => {
      await request(app)
        .post(testRoute)
        .send({
          email: User1.email,
          password: '123ValidButWrong',
        })
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
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
      const { body, status } = await withAccessToken(
        request(app).get(testRoute)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(toUserAccountDTO(User1));
    });
  });

  describe('Update account', () => {
    const testRoute = '/api/account';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .put(testRoute)
        .send(genUserAccountDTO)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should receive valid account', async () => {
      async function test(payload: Record<string, unknown>) {
        const { status } = await withAccessToken(
          request(app).put(testRoute).send(payload)
        );
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
      const { body, status } = await withAccessToken(
        request(app).put(testRoute).send(userAccountDTO)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({});

      await db(usersTable)
        .where('id', User1.id)
        .first()
        .then((result) => {
          expect(result).toEqual(
            expect.objectContaining({
              first_name: userAccountDTO.firstName,
              last_name: userAccountDTO.lastName,
              phone: userAccountDTO.phone,
              position: userAccountDTO.position,
              time_per_week: userAccountDTO.timePerWeek,
            })
          );
        });
    });
  });

  describe('Update password', () => {
    const testRoute = '/api/account/password';

    it('should receive valid current and new passwords', async () => {
      async function test(payload: Record<string, unknown>) {
        const { status } = await withAccessToken(
          request(app).put(testRoute).send(payload)
        );
        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }

      await test({ currentPassword: '', newPassword: '123QWEasd' });
      await test({ currentPassword: '     ', newPassword: '123QWEasd' });
      await test({ currentPassword: User1.password, newPassword: '' });
      await test({ currentPassword: User1.password, newPassword: '    ' });
    });

    it('should fail if the current password and the given one are different', async () => {
      const { status } = await withAccessToken(
        request(app).put(testRoute).send({
          currentPassword: 'NotTheirCurrentPassword',
          newPassword: '123QWEasd',
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should succeed to change the password', async () => {
      const { body, status } = await withAccessToken(
        request(app).put(testRoute).send({
          currentPassword: User1.password,
          newPassword: '123QWEasd',
        })
      );

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
        });

      await request(app)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric',
          }),
          password: 'QWE',
        });

      await request(app)
        .post(testRoute)
        .send({
          key: randomstring.generate({
            length: 100,
            charset: 'alphanumeric',
          }),
          password: 'asd',
        });
    });

    it('should be impossible if the reset link has expired', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(User1.id),
        expiresAt: subDays(new Date(), 1),
      };
      await db(resetLinkTable).insert(formatResetLinkApi(link));

      const { status } = await request(app).post(testRoute).send({
        key: link.id,
        password: '123QWEasd',
      });

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it("should be impossible to change one's password without an existing reset link", async () => {
      const link = genResetLinkApi(User1.id);

      const { status } = await request(app).post(testRoute).send({
        key: link.id,
        password: '123QWEasd',
      });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should change password and use the reset link', async () => {
      const link = genResetLinkApi(User1.id);
      await db(resetLinkTable).insert(formatResetLinkApi(link));

      const { status } = await request(app).post(testRoute).send({
        key: link.id,
        password: '123QWEasd',
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualLink = await db(resetLinkTable)
        .select()
        .where('id', link.id)
        .first();
      expect(actualLink.used_at).toBeInstanceOf(Date);

      const actualUser = await db(usersTable)
        .select()
        .where('id', link.userId)
        .first();
      expect(await bcrypt.compare(User1.password, actualUser.password)).toBe(
        false
      );
    });
  });
});
