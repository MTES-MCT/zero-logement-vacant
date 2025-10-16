import { fc, test } from '@fast-check/vitest';
import { faker } from '@faker-js/faker/locale/fr';
import {
  TIME_PER_WEEK_VALUES,
  UserRole,
  type UserDTO,
  type UserUpdatePayload
} from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { ProspectApi } from '~/models/ProspectApi';
import { SALT_LENGTH, UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatProspectApi,
  Prospects
} from '~/repositories/prospectRepository';
import {
  formatUserApi,
  Users,
  usersTable
} from '~/repositories/userRepository';
import { TEST_ACCOUNTS } from '~/services/ceremaService/consultUserService';
import {
  genEstablishmentApi,
  genProspectApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

let url: string;

describe('User API', () => {
  const establishment = genEstablishmentApi();
  const visitor: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.VISITOR
  };
  const user: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.USUAL
  };
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.ADMIN
  };

  beforeAll(async () => {
    url = await createServer().testing();
  });

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert([visitor, user, admin].map(formatUserApi));
  });

  describe('GET /users', () => {
    const route = '/api/users';

    describe('As an unauthenticated user', () => {
      it('should be missing', async () => {
        const { status } = await request(url).get(route);

        expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
      });
    });

    describe('As an authenticated vistor', () => {
      it('should return the establishment’s users', async () => {
        const { body, status } = await request(url)
          .get(route)
          .use(tokenProvider(visitor));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toSatisfyAll<UserDTO>(
          (user) => user.establishmentId === establishment.id
        );
      });
    });

    describe('As an authenticated user', () => {
      it('should return the establishment’s users', async () => {
        const { body, status } = await request(url)
          .get(route)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toSatisfyAll<UserDTO>(
          (user) => user.establishmentId === establishment.id
        );
      });
    });

    describe('As an authenticated admin', () => {
      it('should return all the users', async () => {
        const otherEstablishment = genEstablishmentApi();
        const otherUsers: ReadonlyArray<UserApi> = faker.helpers.multiple(() =>
          genUserApi(otherEstablishment.id)
        );
        await Establishments().insert(
          formatEstablishmentApi(otherEstablishment)
        );
        await Users().insert(otherUsers.map(formatUserApi));

        const { body, status } = await request(url)
          .get(route)
          .use(tokenProvider(admin));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.length).toBeGreaterThan(1);
        expect(body).toSatisfyAny(
          (user: UserDTO) => user.establishmentId !== establishment.id
        );
      });

      it('should filter by establishment', async () => {
        const { body, status } = await request(url)
          .get(route)
          .query({ establishments: [establishment.id] })
          .use(tokenProvider(admin));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.length).toBeGreaterThan(0);
        expect(body).toSatisfyAll<UserDTO>(
          (user) => user.establishmentId === establishment.id
        );
      });
    });
  });

  describe('POST /users/creations', () => {
    const testRoute = '/api/users/creation';
    const validPassword = '1234QWERasdf';

    let prospect: ProspectApi;

    beforeEach(async () => {
      prospect = genProspectApi(establishment);
      await Prospects().insert(formatProspectApi(prospect));
    });

    it('should received a valid draft user', async () => {
      await request(url)
        .post(testRoute)
        .send({
          ...prospect,
          email: randomstring.generate()
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .post(testRoute)
        .send({
          ...prospect,
          email: undefined
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: randomstring.generate()
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: undefined
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should not actually create a user if it is a test account', async () => {
      const emails = TEST_ACCOUNTS.map((account) => account.email);
      const responses = await Promise.all(
        emails.map((email) =>
          request(url)
            .post(testRoute)
            .send({
              ...prospect,
              email,
              password: validPassword,
              establishmentId: prospect.establishment?.id
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
      const { status } = await request(url).post(testRoute).send({
        email: 'missing@non.existing',
        password: '1234QWERasdf',
        establishmentId: prospect.establishment?.id
      });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be not found if the user establishment does not exist', async () => {
      const { status } = await request(url)
        .post(testRoute)
        .send({
          ...prospect,
          password: validPassword,
          establishmentId: uuidv4()
        });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a new user with Usual role', async () => {
      const { body, status } = await request(url)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: prospect.establishment?.id,
          password: validPassword,
          role: UserRole.ADMIN
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        email: prospect.email,
        establishmentId: prospect.establishment?.id,
        role: UserRole.USUAL
      });

      const user = await Users()
        .where({
          establishment_id: establishment.id,
          email: prospect.email
        })
        .first();
      expect(user).toMatchObject({
        email: prospect.email,
        establishment_id: prospect.establishment?.id,
        role: UserRole.USUAL
      });
    });

    it('should activate user establishment if needed', async () => {
      const establishment: EstablishmentApi = {
        ...genEstablishmentApi(),
        available: false
      };
      await Establishments().insert(formatEstablishmentApi(establishment));

      const { status } = await request(url)
        .post(testRoute)
        .send({
          ...prospect,
          password: validPassword,
          establishmentId: establishment.id
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
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
      const { status } = await request(url).get(testRoute(uuidv4()));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid userId', async () => {
      await request(url)
        .get(testRoute(randomstring.generate()))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it.todo('should be forbidden for a common user to retrieve any user');

    it.todo('should allow a user to retrieve himself');

    it('should retrieve any user if admin', async () => {
      const admin: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.ADMIN
      };
      await Users().insert(formatUserApi(admin));

      const { body, status } = await request(url)
        .get(testRoute(user.id))
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: user.id
      });
    });
  });

  describe('PUT /users/{id}', () => {
    const visitor: UserApi = {
      ...genUserApi(establishment.id),
      role: UserRole.VISITOR
    };
    const user: UserApi = {
      ...genUserApi(establishment.id),
      role: UserRole.USUAL
    };
    const admin: UserApi = {
      ...genUserApi(establishment.id),
      role: UserRole.ADMIN
    };
    const testRoute = (id: string) => `/api/users/${id}`;

    beforeAll(async () => {
      await Users().insert([visitor, user, admin].map(formatUserApi));
    });

    describe('As an unauthenticated guest', () => {
      it('should be unauthorized', async () => {
        const payload: UserUpdatePayload = {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          position: faker.person.jobTitle(),
          timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES)
        };

        const { status } = await request(url)
          .put(testRoute(user.id))
          .send(payload)
          .type('json');

        expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
      });
    });

    describe('As an authenticated visitor', () => {
      it('should be forbidden', async () => {
        const payload: UserUpdatePayload = {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          position: faker.person.jobTitle(),
          timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES)
        };

        const { status } = await request(url)
          .put(testRoute(user.id))
          .send(payload)
          .type('json')
          .use(tokenProvider(visitor));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });
    });

    describe('As an authenticated user', () => {
      it('should be forbidden to update another user', async () => {
        const payload: UserUpdatePayload = {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          position: faker.person.jobTitle(),
          timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES)
        };

        const { status } = await request(url)
          .put(testRoute(visitor.id))
          .send(payload)
          .type('json')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });

      it('should be able to update themselves', async () => {
        const payload: UserUpdatePayload = {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          position: faker.person.jobTitle(),
          timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES)
        };

        const { body, status } = await request(url)
          .put(testRoute(user.id))
          .send(payload)
          .type('json')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject<Partial<UserDTO>>({
          ...payload,
          id: user.id
        });
      });
    });

    describe('As an authenticated admin', () => {
      it('should be able to update any user', async () => {
        const payload: UserUpdatePayload = {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number(),
          position: faker.person.jobTitle(),
          timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES)
        };

        const { body, status } = await request(url)
          .put(testRoute(user.id))
          .send(payload)
          .type('json')
          .use(tokenProvider(admin));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject<Partial<UserDTO>>({
          ...payload,
          id: user.id
        });
      });
    });

    describe('Validation', () => {
      const TEST_PASSWORD = '1234QWERasdf';

      it('should return 404 for a missing user', async () => {
        const { status } = await request(url)
          .put(testRoute(faker.string.uuid()))
          .send({
            firstName: 'Test'
          })
          .type('json')
          .use(tokenProvider(admin));

        expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
      });

      it('should require a valid user id', async () => {
        const { status } = await request(url)
          .put(testRoute(faker.string.alphanumeric(10)))
          .send({
            firstName: 'Test'
          })
          .type('json')
          .use(tokenProvider(admin));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      });

      const TIMEOUT = 20_000;

      test.prop<UserUpdatePayload>(
        {
          firstName: fc.string({ minLength: 1, maxLength: 255 }),
          lastName: fc.string({ minLength: 1, maxLength: 255 }),
          phone: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          position: fc.option(fc.string({ minLength: 1, maxLength: 255 })),
          timePerWeek: fc.option(fc.constantFrom(...TIME_PER_WEEK_VALUES)),
          password: fc.option(
            fc.record({
              before: fc.constant(TEST_PASSWORD),
              after: fc
                .tuple(
                  fc.stringMatching(/[a-z]/g),
                  fc.stringMatching(/[A-Z]/g),
                  fc.stringMatching(/[0-9]/g),
                  fc.stringMatching(/\S{9,255}/g)
                )
                .map(
                  ([lowercase, uppercase, number, rest]) =>
                    lowercase + uppercase + number + rest
                )
            }),
            { nil: undefined }
          )
        },
        { interruptAfterTimeLimit: TIMEOUT }
      )('should validate inputs', async (payload) => {
        const user: UserApi = {
          ...genUserApi(establishment.id),
          password: await bcrypt.hash(TEST_PASSWORD, SALT_LENGTH)
        };
        await Users().insert(formatUserApi(user));

        const { status } = await request(url)
          .put(testRoute(user.id))
          .send(payload)
          .type('json')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
      });
    });
  });

  describe('DELETE /users/{id}', () => {
    const testRoute = (id: string) => `/api/users/${id}`;

    describe('As an unauthenticated guest', () => {
      it('should be unauthorized', async () => {
        const { status } = await request(url).delete(testRoute(user.id));

        expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
      });
    });

    describe('As an authenticated visitor', () => {
      it('should be forbidden', async () => {
        const { status } = await request(url)
          .delete(testRoute(user.id))
          .use(tokenProvider(visitor));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });
    });

    describe('As an authenticated user', () => {
      it('should be forbidden', async () => {
        const { status } = await request(url)
          .delete(testRoute(visitor.id))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
      });
    });

    describe('As an authenticated admin', () => {
      it('should delete any user', async () => {
        const { status } = await request(url)
          .delete(testRoute(user.id))
          .use(tokenProvider(admin));

        expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      });
    });
  });
});
