import { Request } from 'express';
import request from 'supertest';
import randomstring from 'randomstring';
import { constants } from 'http2';
import { User1 } from '../../database/seeds/test/003-users';
import {
  genBoolean,
  genEmail,
  genNumber,
  genResetLinkApi,
} from '../test/testFixtures';
import fetchMock from 'jest-fetch-mock';
import config from '../utils/config';
import db from '../repositories/db';
import { prospectsTable } from '../repositories/prospectRepository';
import { Prospect1 } from '../../database/seeds/test/007-prospects';
import { JsonObject } from 'type-fest';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { TEST_ACCOUNTS } from '../models/ProspectApi';
import {
  formatResetLinkApi,
  resetLinkTable,
} from '../repositories/resetLinkRepository';
import { ResetLinkApi } from '../models/ResetLinkApi';
import { subDays } from 'date-fns';
import { usersTable } from '../repositories/userRepository';
import bcrypt from 'bcryptjs';
import { createServer } from '../server';

const { app } = createServer();

beforeEach(() => {
  fetchMock.resetMocks();
});

const mockCeremaConsultUser = (email: string, user: JsonObject | undefined) => {
  fetchMock.mockResponse((request: Request) => {
    return Promise.resolve(
      (() => {
        if (
          request.url ===
          `${config.cerema.api.endpoint}/api/consult/utilisateurs/?email=${email}`
        ) {
          return {
            body: JSON.stringify(user ? [user] : []),
            init: { status: 200 },
          };
        } else return { body: '', init: { status: 404 } };
      })()
    );
  });
};

const mockCeremaFail = () => {
  fetchMock.mockResponse(() => {
    return Promise.resolve({
      status: 404,
    });
  });
};

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

    it('should bypass user validation in case of a reserved account', async () => {
      const emails = TEST_ACCOUNTS.map((account) => account.email);
      const responses = await Promise.all(
        emails.map((email) => request(app).get(testRoute(email)))
      );

      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
        expect(response.body).toStrictEqual(TEST_ACCOUNTS[i]);
      });
    });

    it('should return forbidden when a user already exist', async () => {
      await request(app)
        .get(testRoute(User1.email))
        .expect(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should fail if the user does not exist in Cerema', async () => {
      const email = genEmail();
      mockCeremaFail();

      const { body, status } = await request(app).get(testRoute(email));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        email,
        hasAccount: false,
        hasCommitment: false,
      });
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should consult Cerema for a new prospect, then insert an return the result when user unknown from Cerema', async () => {
      const email = genEmail();

      mockCeremaConsultUser(email, undefined);

      const res = await request(app)
        .get(testRoute(email))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject({
        email,
        hasAccount: false,
        hasCommitment: false,
      });

      expect(fetchMock).toHaveBeenCalled();

      await db(prospectsTable)
        .where('email', email)
        .first()
        .then((result) => {
          expect(result).toEqual(
            expect.objectContaining({
              email,
              has_account: false,
              has_commitment: false,
            })
          );
        });
    });

    it('should consult Cerema for a new prospect, then insert an return the result when user known from Cerema', async () => {
      const email = genEmail();
      const hasCommitment = genBoolean();
      const siren = Establishment1.siren;

      mockCeremaConsultUser(email, {
        siret: String(siren) + String(genNumber(5)),
        lovac_ok: hasCommitment,
        email,
      });

      const res = await request(app)
        .get(testRoute(email))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject({
        email,
        hasAccount: true,
        hasCommitment,
        establishment: {
          id: Establishment1.id,
          siren: siren,
        },
      });

      expect(fetchMock).toHaveBeenCalled();

      await db(prospectsTable)
        .where('email', email)
        .first()
        .then((result) => {
          expect(result).toEqual(
            expect.objectContaining({
              email,
              has_account: true,
              has_commitment: hasCommitment,
              establishment_siren: siren,
            })
          );
        });
    });

    it('should consult Cerema for an existing prospect, then update an return the result when user known from Cerema', async () => {
      const hasCommitment = genBoolean();
      const siren = Establishment1.siren;

      mockCeremaConsultUser(Prospect1.email, {
        siret: String(siren) + String(genNumber(5)),
        lovac_ok: hasCommitment,
        email: Prospect1.email,
      });

      const res = await request(app)
        .get(testRoute(Prospect1.email))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject({
        email: Prospect1.email,
        hasAccount: true,
        hasCommitment,
        establishment: {
          id: Establishment1.id,
          siren: siren,
        },
      });

      expect(fetchMock).toHaveBeenCalled();

      await db(prospectsTable)
        .where('email', Prospect1.email)
        .first()
        .then((result) => {
          expect(result).toEqual(
            expect.objectContaining({
              email: Prospect1.email,
              has_account: true,
              has_commitment: hasCommitment,
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
