import db from '../repositories/db';
import request from 'supertest';
import randomstring from 'randomstring';
import { withAccessToken, withAdminAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import {
  genEstablishmentApi,
  genHousingApi,
  genLocalityApi, genSiren,
  genUserApi
} from '../test/testFixtures';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { UserRoles } from '../models/UserApi';
import { usersTable } from '../repositories/userRepository';
import { User1 } from '../../database/seeds/test/003-users';
import { v4 as uuidv4 } from 'uuid';
import establishmentRepository, {
  establishmentsTable
} from '../repositories/establishmentRepository';
import { campaignsTable } from '../repositories/campaignRepository';
import { localitiesTable } from '../repositories/localityRepository';
import housingRepository, {
  housingTable,
  ownersHousingTable
} from '../repositories/housingRepository';
import { Owner1 } from '../../database/seeds/test/004-owner';
import { createServer } from '../server';
import { TEST_ACCOUNTS } from "../models/ProspectApi";
import fetchMock from "jest-fetch-mock";
import { JsonObject } from "type-fest";
import { Request } from "express";
import config from "../utils/config";

const { app } = createServer()

describe('User controller', () => {

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  const mockCeremaConsultUser = (email: string, user: JsonObject | undefined) => {
    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        (() => {
          if (request.url === `${config.cerema.api.endpoint}/api/consult/utilisateurs/?email=${email}`) {
            return {
              body: JSON.stringify(user ? [user] : []), init: { status: 200 }
            }
          } else return { body: '', init: { status: 404 } }
        })()
      )
    });
  }

  const mockCeremaFail = () => {
    fetchMock.mockResponse(() => {
      return Promise.resolve({
        status: 404
      })
    })
  }


  describe('createUser', () => {

        const testRoute = '/api/users/creation'

        const draftUser = {...genUserApi(Establishment1.id), id: undefined}

        it('should not actually create a user if it is a test account', async () => {
          const emails = TEST_ACCOUNTS.map(account => account.email)
          const responses = await Promise.all(
            emails.map(email =>
              request(app)
                .post(testRoute)
                .send({
                  ...draftUser,
                  email,
                })
            )
          )

          responses.forEach(response => {
            expect(response.status).toBe(constants.HTTP_STATUS_FORBIDDEN)
          })
          const users = await db(usersTable)
            .count('email as count')
            .whereIn('email', emails)
            .first()
          expect(Number(users?.count)).toBe(0)
        })

        it('should fail if the user is not allowed by Cerema', async () => {
          mockCeremaFail()

          const { status } = await request(app).post(testRoute).send(draftUser)

          expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
          expect(fetchMock).toHaveBeenCalled()
        })

        it('should be not found if the user establishment does not exist', async () => {
            mockCeremaConsultUser(draftUser.email, {
              email: draftUser.email,
              siret: genSiren().toString(),
              lovac_ok: true
            })

            await request(app).post(testRoute)
                .send({
                    ...draftUser,
                    establishmentId: uuidv4()
                })
                .expect(constants.HTTP_STATUS_NOT_FOUND);
        });

        it('should received a valid draft user', async () => {

            await request(app).post(testRoute)
                .send({
                  ...draftUser,
                  email: randomstring.generate()
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await request(app).post(testRoute)
                .send({
                  ...draftUser,
                  email: undefined
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await request(app).post(testRoute)
                .send({
                  ...draftUser,
                  establishmentId: randomstring.generate()
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await request(app).post(testRoute)
                .send({
                  ...draftUser,
                  establishmentId: undefined
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

          await request(app).post(testRoute)
            .send({
              ...draftUser,
              campaignIntent: '123'
            })
            .expect(constants.HTTP_STATUS_BAD_REQUEST);

        });

        it('should create a new user with Usual role', async () => {
            mockCeremaConsultUser(draftUser.email, {
              email: draftUser.email,
              siret: genSiren().toString(),
              lovac_ok: true
            })

            const res = await request(app).post(testRoute)
                .send({ ...draftUser, role: UserRoles.Admin })
                .expect(constants.HTTP_STATUS_CREATED);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    email: draftUser.email,
                    firstName: draftUser.firstName,
                    lastName: draftUser.lastName,
                    establishmentId: draftUser.establishmentId,
                    role: UserRoles.Usual
                })
            )

            await db(usersTable)
                .where('establishment_id', Establishment1.id)
                .andWhere('email', draftUser.email)
                .then(result => {
                    expect(result[0]).toEqual(expect.objectContaining({
                            email: draftUser.email,
                            first_name: draftUser.firstName,
                            last_name: draftUser.lastName,
                            establishment_id: draftUser.establishmentId,
                            role: UserRoles.Usual
                        }
                    ))
                });
        })

        it('should activate user establishment if needed', async () => {
            mockCeremaConsultUser(draftUser.email, {
              email: draftUser.email,
              siret: genSiren().toString(),
              lovac_ok: true
            })
            const Locality = genLocalityApi()
            const Establishment = genEstablishmentApi(Locality)
            await db(localitiesTable).insert(establishmentRepository.formatLocalityApi(Locality))
            await db(establishmentsTable).insert({...establishmentRepository.formatEstablishmentApi(Establishment), available: false})
            const housing = (new Array(2500)).fill(0).map(_ => genHousingApi(Locality.geoCode))
            await db(housingTable).insert(housing.map(_ => housingRepository.formatHousingApi(_)))
            await db(ownersHousingTable).insert(housing.map(_ => ({
                owner_id: Owner1.id,
                housing_id: _.id,
                rank: 1
            })))

            const res = await request(app).post(testRoute)
                .send({
                    ...draftUser,
                    establishmentId: Establishment.id
                })
                .expect(constants.HTTP_STATUS_CREATED);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    email: draftUser.email,
                    firstName: draftUser.firstName,
                    lastName: draftUser.lastName,
                    establishmentId: Establishment.id,
                    role: UserRoles.Usual
                })
            )

            await db(establishmentsTable)
                .where('id', Establishment.id)
                .then(result => {
                    expect(result[0]).toEqual(expect.objectContaining({
                        id: Establishment.id,
                        available: true
                    }))
                });

            await db(campaignsTable)
                .where('establishment_id', Establishment.id)
                .then(result => {
                    expect(result[0]).toEqual(expect.objectContaining({
                        establishment_id: Establishment.id,
                        campaign_number: 0
                    }))
                });
        })
    })

  describe('removeUser', () => {
    const { id, email } = User1
    const testRoute = `/api/users/${id}`;

    it('should be forbidden for a non authenticated user', async () => {
      await request(app).delete(testRoute).expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a non admin user', async () => {
      await withAccessToken(
        request(app).delete(testRoute)
      ).expect(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should be a bad request if the id is not well formatted', async () => {
      await withAdminAccessToken(request(app).delete('/api/users/wrongformat'))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be not found if the user does not exist', async () => {
      await withAdminAccessToken(request(app).delete(`/api/users/${uuidv4()}`))
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should partially remove a user if they exist', async () => {
      await withAdminAccessToken(request(app).delete(testRoute))
        .expect(constants.HTTP_STATUS_NO_CONTENT);

      const user = await db.table(usersTable)
        .where('email', email)
        .first();
      expect(user.deleted_at).toBeInstanceOf(Date);
    });
  });

});

