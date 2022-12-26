import request from 'supertest';
import randomstring from 'randomstring';
import { constants } from 'http2';
import { User1 } from '../../database/seeds/test/003-users';
import { genEmail, genResetLinkApi } from '../test/testFixtures';
import fetchMock from 'jest-fetch-mock';
import db from '../repositories/db';
import { prospectsTable } from '../repositories/prospectRepository';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
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
  describe('getAccount', () => {
    const testRoute = (email: string) => `/api/prospects/${email}`;

    it('should receive a valid email', async () => {
      await request(app)
        .get(testRoute('a'))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .get(testRoute(randomstring.generate()))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return forbidden when a user already exist', async () => {
      await request(app)
        .get(testRoute(User1.email))
        .expect(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should consult Cerema for a new prospect, then insert an return the result when user known from Cerema', async () => {
      const email = genEmail();
      const siren = Establishment1.siren;

      const res = await request(app)
        .get(testRoute(email))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject({
        email,
        hasAccount: true,
        hasCommitment: true,
        establishment: {
          id: Establishment1.id,
          siren: Establishment1.siren,
        },
      });

      await db(prospectsTable)
        .where('email', email)
        .first()
        .then((result) => {
          expect(result).toEqual(
            expect.objectContaining({
              email,
              has_account: true,
              has_commitment: true,
              establishment_siren: siren,
            })
          );
        });
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
