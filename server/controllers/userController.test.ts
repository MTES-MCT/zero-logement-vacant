import db from '../repositories/db';
import protectedRouter from '../routers/protected';
import express from 'express';
import request from 'supertest';
import randomstring from 'randomstring';
import { withAccessToken, withAdminAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import bodyParser from 'body-parser';
import { genUserApi } from '../test/testFixtures';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { UserRoles } from '../models/UserApi';
import { usersTable } from '../repositories/userRepository';
import { User1 } from "../../database/seeds/test/003-users";
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(protectedRouter);

describe('User controller', () => {

    describe('createUser', () => {

        const testRoute = '/api/users/creation'

        const draftUser = {...genUserApi(Establishment1.id), id: undefined}

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).post(testRoute).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should be forbidden for a not admin user', async () => {
            await withAccessToken(request(app).post(testRoute))
                .send({ draftUser })
                .expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should received a valid draft user', async () => {

            await withAdminAccessToken(request(app).post(testRoute))
                .send({
                    draftUser: {
                        ...draftUser,
                        email: randomstring.generate()
                    }
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await withAdminAccessToken(request(app).post(testRoute))
                .send({
                    draftUser: {
                        ...draftUser,
                        email: undefined
                    }
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await withAdminAccessToken(request(app).post(testRoute))
                .send({
                    draftUser: {
                        ...draftUser,
                        id: uuidv4()
                    }
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await withAdminAccessToken(request(app).post(testRoute))
                .send({
                    draftUser: {
                        ...draftUser,
                        establishmentId: randomstring.generate()
                    }
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await withAdminAccessToken(request(app).post(testRoute))
                .send({
                    draftUser: {
                        ...draftUser,
                        establishmentId: undefined
                    }
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await withAdminAccessToken(request(app).post(testRoute))
                .send({
                    draftUser: {
                        ...draftUser,
                        firstName: undefined
                    }
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            await withAdminAccessToken(request(app).post(testRoute))
                .send({
                    draftUser: {
                        ...draftUser,
                        lastName: undefined
                    }
                })
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

        });

        it('should create a new user with Usual role', async () => {

            const res = await withAdminAccessToken(request(app).post(testRoute))
                .send({ draftUser, role: UserRoles.Admin })
                .expect(constants.HTTP_STATUS_OK);

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

