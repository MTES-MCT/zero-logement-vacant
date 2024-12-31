import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import db from '~/infra/database';
import { tokenProvider } from '~/test/testUtils';
import {
  genEstablishmentApi,
  genCreateUserBody,
  genUserApi
} from '~/test/testFixtures';
import { UserApi, UserRoles } from '~/models/UserApi';
import {
  formatUserApi,
  Users,
  usersTable
} from '~/repositories/userRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { TEST_ACCOUNTS } from '~/services/ceremaService/consultUserService';

const { app } = createServer();

describe('User API', () => {
  const establishment = genEstablishmentApi();

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
  });

  describe('POST /users/creations', () => {
    const testRoute = '/api/users/creation';
    const validPassword = '1234QWERasdf';

    it('should received a valid draft user', async () => {
      const user = genCreateUserBody();

      await request(app)
        .post(testRoute)
        .send({
          ...user,
          email: randomstring.generate()
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...user,
          email: undefined
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...user,
          establishmentId: randomstring.generate()
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...user,
          establishmentId: undefined
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should not actually create a user if it is a test account', async () => {
      const emails = TEST_ACCOUNTS.map((account) => account.email);
      const user = genCreateUserBody();
      const responses = await Promise.all(
        emails.map((email) =>
          request(app)
            .post(testRoute)
            .send({
              ...user,
              email,
              password: validPassword,
              establishmentId: user.establishmentId
            })
        )
      );

      responses.forEach((response) => {
        expect(response.status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });
      const users = await db(usersTable)
        .count('email as count')
        .whereIn('email', emails)
        .first();
      expect(Number(users?.count)).toBe(0);
    });

    it('should fail if the prospect is missing', async () => {
      const user = genCreateUserBody();
      const { status } = await request(app).post(testRoute).send({
        email: 'missing@non.existing',
        password: '1234QWERasdf',
        establishmentId: user.establishmentId
      });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be not found if the user establishment does not exist', async () => {
      const user = genCreateUserBody();
      const { status } = await request(app)
        .post(testRoute)
        .send({
          ...user,
          password: validPassword,
          establishmentId: uuidv4()
        });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a new user with Usual role', async () => {
      const user = genCreateUserBody();
      user.establishmentId = establishment.id;
      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          ...user,
          establishmentId: user.establishmentId,
          password: validPassword,
          role: UserRoles.Admin
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        email: user.email,
        establishmentId: user.establishmentId,
        role: UserRoles.Usual
      });

      const u = await Users()
        .where({
          establishment_id: establishment.id,
          email: user.email
        })
        .first();
      expect(u).toMatchObject({
        email: user.email,
        establishment_id: user.establishmentId,
        role: UserRoles.Usual
      });
    });

    it('should activate user establishment if needed', async () => {
      const establishment: EstablishmentApi = {
        ...genEstablishmentApi(),
        available: false
      };
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genCreateUserBody();
      user.establishmentId = establishment.id;
      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          ...user,
          password: validPassword,
          establishmentId: establishment.id
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        email: user.email,
        establishmentId: establishment.id,
        role: UserRoles.Usual
      });

      const actual = await Establishments()
        .where('id', establishment.id)
        .first();
      expect(actual).toMatchObject({
        id: establishment.id,
        available: true
      });
    });
  });

  describe('GET /users/{id}', () => {
    const user = genUserApi(establishment.id);

    const testRoute = (id: string) => `/api/users/${id}`;

    beforeAll(async () => {
      await Users().insert(formatUserApi(user));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(uuidv4()));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid userId', async () => {
      await request(app)
        .get(testRoute(randomstring.generate()))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it.todo('should be forbidden for a common user to retrieve any user');

    it.todo('should allow a user to retrieve himself');

    it('should retrieve any user if admin', async () => {
      const admin: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRoles.Admin
      };
      await Users().insert(formatUserApi(admin));

      const { body, status } = await request(app)
        .get(testRoute(user.id))
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: user.id
      });
    });
  });
});
