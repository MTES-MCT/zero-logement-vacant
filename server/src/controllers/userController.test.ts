import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import db from '~/infra/database';
import { tokenProvider } from '~/test/testUtils';
import {
  genEstablishmentApi,
  genProspectApi,
  genUserApi
} from '~/test/testFixtures';
import { UserApi, UserRoles } from '~/models/UserApi';
import {
  formatUserApi,
  Users,
  usersTable
} from '~/repositories/userRepository';
import { User1 } from '~/infra/database/seeds/test/20240405012221_users';
import {
  Establishments,
  establishmentsTable,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { createServer } from '~/infra/server';
import { CampaignIntent, EstablishmentApi } from '~/models/EstablishmentApi';
import { TEST_ACCOUNTS } from '~/services/ceremaService/consultUserService';
import {
  formatProspectApi,
  Prospects
} from '~/repositories/prospectRepository';
import { ProspectApi } from '~/models/ProspectApi';

const { app, } = createServer();

describe('User API', () => {
  const establishment = genEstablishmentApi();

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
  });

  describe('POST /users/creations', () => {
    const testRoute = '/api/users/creation';
    const validPassword = '123QWEasd';

    let prospect: ProspectApi;

    beforeEach(async () => {
      prospect = genProspectApi(establishment);
      await Prospects().insert(formatProspectApi(prospect));
    });

    it('should received a valid draft user', async () => {
      await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          email: randomstring.generate(),
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          email: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: randomstring.generate(),
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          campaignIntent: '123',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should not actually create a user if it is a test account', async () => {
      const emails = TEST_ACCOUNTS.map((account) => account.email);
      const responses = await Promise.all(
        emails.map((email) =>
          request(app)
            .post(testRoute)
            .send({
              ...prospect,
              email,
              password: validPassword,
              establishmentId: prospect.establishment?.id,
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
      const { status, } = await request(app).post(testRoute).send({
        email: 'missing@non.existing',
        password: '123QWEasd',
        establishmentId: prospect.establishment?.id,
      });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be not found if the user establishment does not exist', async () => {
      const { status, } = await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          password: validPassword,
          establishmentId: uuidv4(),
        });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a new user with Usual role', async () => {
      const { body, status, } = await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: prospect.establishment?.id,
          password: validPassword,
          role: UserRoles.Admin,
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        email: prospect.email,
        establishmentId: prospect.establishment?.id,
        role: UserRoles.Usual,
      });

      const user = await Users()
        .where({
          establishment_id: establishment.id,
          email: prospect.email,
        })
        .first();
      expect(user).toMatchObject({
        email: prospect.email,
        establishment_id: prospect.establishment?.id,
        role: UserRoles.Usual,
      });
    });

    it('should save the establishment campaign intent if it was not provided yet', async () => {
      const campaignIntent: CampaignIntent = '2-4';
      await db(establishmentsTable).where('id', establishment.id).update({
        campaign_intent: null,
      });

      const { status, } = await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: prospect.establishment?.id,
          password: validPassword,
          campaignIntent,
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const actual = await Establishments()
        .where('id', establishment.id)
        .first();
      expect(actual?.campaign_intent).toBe(campaignIntent);
    });

    it('should activate user establishment if needed', async () => {
      const establishment: EstablishmentApi = {
        ...genEstablishmentApi(),
        available: false,
      };
      await Establishments().insert(formatEstablishmentApi(establishment));

      const { body, status, } = await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          password: validPassword,
          establishmentId: establishment.id,
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        email: prospect.email,
        establishmentId: establishment.id,
        role: UserRoles.Usual,
      });

      const actual = await Establishments()
        .where('id', establishment.id)
        .first();
      expect(actual).toMatchObject({
        id: establishment.id,
        available: true,
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
      const { status, } = await request(app).get(testRoute(User1.id));

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
        role: UserRoles.Admin,
      };
      await Users().insert(formatUserApi(admin));

      const { body, status, } = await request(app)
        .get(testRoute(user.id))
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: user.id,
      });
    });
  });
});
