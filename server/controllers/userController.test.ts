import db from '../repositories/db';
import request from 'supertest';
import randomstring from 'randomstring';
import { withAccessToken, withAdminAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import {
  genEstablishmentApi,
  genHousingApi,
  genLocalityApi,
} from '../test/testFixtures';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { UserRoles } from '../models/UserApi';
import { usersTable } from '../repositories/userRepository';
import { User1 } from '../../database/seeds/test/003-users';
import { v4 as uuidv4 } from 'uuid';
import establishmentRepository, {
  establishmentsTable,
} from '../repositories/establishmentRepository';
import { campaignsTable } from '../repositories/campaignRepository';
import localityRepository, {
  localitiesTable,
} from '../repositories/localityRepository';
import housingRepository, {
  housingTable,
  ownersHousingTable,
} from '../repositories/housingRepository';
import { Owner1 } from '../../database/seeds/test/004-owner';
import { createServer } from '../server';
import { TEST_ACCOUNTS } from '../models/ProspectApi';
import fetchMock from 'jest-fetch-mock';
import { CampaignIntent } from '../models/EstablishmentApi';
import { Prospect1 } from '../../database/seeds/test/007-prospects';

const { app } = createServer();

describe('User controller', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe('createUser', () => {
    const testRoute = '/api/users/creation';
    const prospect = Prospect1;
    const validPassword = '123QWEasd';

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
      const { status } = await request(app).post(testRoute).send({
        email: 'missing@non.existing',
        password: '123QWEasd',
        establishmentId: prospect.establishment?.id,
      });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be not found if the user establishment does not exist', async () => {
      await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          password: validPassword,
          establishmentId: uuidv4(),
        })
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a new user with Usual role', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: prospect.establishment?.id,
          password: validPassword,
          role: UserRoles.Admin,
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject(
        expect.objectContaining({
          email: prospect.email,
          establishmentId: prospect.establishment?.id,
          role: UserRoles.Usual,
        })
      );

      await db(usersTable)
        .where('establishment_id', Establishment1.id)
        .andWhere('email', prospect.email)
        .then((result) => {
          expect(result[0]).toEqual(
            expect.objectContaining({
              email: prospect.email,
              establishment_id: prospect.establishment?.id,
              role: UserRoles.Usual,
            })
          );
        });
    });

    it('should save the establishment campaign intent if it was not provided yet', async () => {
      const campaignIntent: CampaignIntent = '2-4';

      const { status } = await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          establishmentId: prospect.establishment?.id,
          password: validPassword,
          campaignIntent,
        });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const establishment = await db(establishmentsTable)
        .where('id', Establishment1.id)
        .first();
      expect(establishment.campaign_intent).toBe(campaignIntent);
    });

    it('should activate user establishment if needed', async () => {
      const Locality = genLocalityApi();
      const establishment = genEstablishmentApi(Locality.geoCode);
      await db(localitiesTable).insert({
        id: uuidv4(),
        ...localityRepository.formatLocalityApi(Locality),
      });
      await db(establishmentsTable).insert({
        ...establishmentRepository.formatEstablishmentApi(establishment),
        available: false,
      });
      const housing = new Array(2500)
        .fill(0)
        .map(() => genHousingApi(Locality.geoCode));
      await db(housingTable).insert(
        housing.map((_) => housingRepository.formatHousingApi(_))
      );
      await db(ownersHousingTable).insert(
        housing.map((_) => ({
          owner_id: Owner1.id,
          housing_id: _.id,
          rank: 1,
        }))
      );

      const res = await request(app)
        .post(testRoute)
        .send({
          ...prospect,
          password: validPassword,
          establishmentId: establishment.id,
        })
        .expect(constants.HTTP_STATUS_CREATED);

      jest.runOnlyPendingTimers();

      expect(res.body).toMatchObject(
        expect.objectContaining({
          email: prospect.email,
          establishmentId: establishment.id,
          role: UserRoles.Usual,
        })
      );

      await db(establishmentsTable)
        .where('id', establishment.id)
        .then((result) => {
          expect(result[0]).toEqual(
            expect.objectContaining({
              id: establishment.id,
              available: true,
            })
          );
        });

      await db(campaignsTable)
        .where('establishment_id', establishment.id)
        .then((result) => {
          expect(result[0]).toEqual(
            expect.objectContaining({
              establishment_id: establishment.id,
              campaign_number: 0,
            })
          );
        });
    });
  });

  describe('list', () => {
    const testRoute = '/api/users';

    it('should be forbidden for a non authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list all users when authenticated user has admin role', async () => {
      const res = await withAdminAccessToken(
        request(app).post(testRoute)
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject({ filteredCount: 3, totalCount: 3 });
    });

    it('should filter users', async () => {
      const res = await withAdminAccessToken(
        request(app)
          .post(testRoute)
          .send({
            filters: { establishmentIds: [Establishment1.id] },
          })
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject({ filteredCount: 1, totalCount: 3 });
    });

    it('should list only establishment users when authenticated user has not admin role', async () => {
      const res = await withAccessToken(request(app).post(testRoute)).expect(
        constants.HTTP_STATUS_OK
      );

      expect(res.body).toMatchObject({ filteredCount: 1, totalCount: 1 });
    });
  });

  describe('removeUser', () => {
    const { id, email } = User1;
    const testRoute = `/api/users/${id}`;

    it('should be forbidden for a non authenticated user', async () => {
      await request(app)
        .delete(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a non admin user', async () => {
      await withAccessToken(request(app).delete(testRoute)).expect(
        constants.HTTP_STATUS_FORBIDDEN
      );
    });

    it('should be a bad request if the id is not well formatted', async () => {
      await withAdminAccessToken(
        request(app).delete('/api/users/wrongformat')
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be not found if the user does not exist', async () => {
      await withAdminAccessToken(
        request(app).delete(`/api/users/${uuidv4()}`)
      ).expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should partially remove a user if they exist', async () => {
      await withAdminAccessToken(request(app).delete(testRoute)).expect(
        constants.HTTP_STATUS_NO_CONTENT
      );

      const user = await db.table(usersTable).where('email', email).first();
      expect(user.deleted_at).toBeInstanceOf(Date);
    });
  });
});
