import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import {
  Establishment1,
  Establishment2,
} from '../../database/seeds/test/001-establishments';
import { createServer } from '../server';
import {
  ContactPoint1,
  ContactPoint2,
} from '../../database/seeds/test/008-contact-points';
import contactPointsRepository from '../repositories/contactPointsRepository';
import { v4 as uuidv4 } from 'uuid';
import { genContactPointApi } from '../test/testFixtures';
import randomstring from 'randomstring';

const { app } = createServer();

describe('ContactPoint controller', () => {
  describe('listContactPoints', () => {
    const testRoute = '/api/contact-points';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list the contact points for the authenticated user', async () => {
      const res = await withAccessToken(request(app).get(testRoute)).expect(
        constants.HTTP_STATUS_OK
      );

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: ContactPoint1.id,
            establishmentId: Establishment1.id,
            title: ContactPoint1.title,
            opening: ContactPoint1.opening,
            address: ContactPoint1.address,
            email: ContactPoint1.email,
          }),
        ])
      );
      expect(res.body).not.toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: ContactPoint2.id,
          }),
        ])
      );
    });
  });

  describe('createContactPoint', () => {
    const testRoute = '/api/contact-points';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received valid parameters', async () => {
      await withAccessToken(request(app).post(testRoute))
        .send({})
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(request(app).post(testRoute))
        .send({
          title: randomstring.generate(),
          email: randomstring.generate(),
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should create the contact point', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, establishmentId, ...body } = genContactPointApi(
        Establishment1.id
      );

      await withAccessToken(request(app).post(testRoute))
        .send(body)
        .expect(constants.HTTP_STATUS_OK);

      await contactPointsRepository
        .listContactPoints(ContactPoint1.establishmentId)
        .then((result) => {
          expect(result).toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: ContactPoint1.id,
              }),
              expect.objectContaining({
                establishmentId: Establishment1.id,
                title: body.title,
                email: body.email,
              }),
            ])
          );
        });
    });
  });

  describe('updateContactPoint', () => {
    const testRoute = (contactPointId?: string) =>
      `/api/contact-points${contactPointId ? '/' + contactPointId : ''}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .put(testRoute(ContactPoint1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a user from another establishment', async () => {
      await withAccessToken(request(app).put(testRoute(ContactPoint2.id)))
        .send(genContactPointApi(Establishment2.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be missing', async () => {
      await withAccessToken(request(app).delete(testRoute(uuidv4()))).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );
    });

    it('should received valid parameters', async () => {
      await withAccessToken(request(app).put(testRoute())).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );

      await withAccessToken(request(app).put(testRoute('id'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );

      await withAccessToken(request(app).put(testRoute(ContactPoint1.id)))
        .send({
          email: randomstring.generate(),
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should update the contact point', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, establishmentId, ...body } = genContactPointApi(
        Establishment1.id
      );

      await withAccessToken(request(app).put(testRoute(ContactPoint1.id)))
        .send(body)
        .expect(constants.HTTP_STATUS_OK);

      await contactPointsRepository
        .listContactPoints(ContactPoint1.establishmentId)
        .then((result) => {
          expect(result).toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: ContactPoint1.id,
                establishmentId: Establishment1.id,
                title: body.title,
                email: body.email,
              }),
            ])
          );
        });
    });
  });

  describe('deleteContactPoint', () => {
    const testRoute = (contactPointId?: string) =>
      `/api/contact-points${contactPointId ? '/' + contactPointId : ''}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .delete(testRoute(ContactPoint1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be missing', async () => {
      await withAccessToken(request(app).delete(testRoute(uuidv4()))).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );
    });

    it('should be forbidden for a user from another establishment', async () => {
      await withAccessToken(
        request(app).delete(testRoute(ContactPoint2.id))
      ).expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid contact point id', async () => {
      await withAccessToken(request(app).delete(testRoute())).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );

      await withAccessToken(request(app).delete(testRoute('id'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );
    });

    it('should delete the contact point', async () => {
      await withAccessToken(
        request(app).delete(testRoute(ContactPoint1.id))
      ).expect(constants.HTTP_STATUS_OK);

      await contactPointsRepository
        .listContactPoints(ContactPoint1.establishmentId)
        .then((result) => {
          expect(result).toEqual([]);
        });
    });
  });
});
