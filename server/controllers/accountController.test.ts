import request from 'supertest';
import randomstring from 'randomstring';
import { constants } from 'http2';
import { User1 } from '../../database/seeds/test/003-users';
import { genResetLinkApi } from '../test/testFixtures';
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
          password: '',
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

  describe('resetPassword', () => {
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
