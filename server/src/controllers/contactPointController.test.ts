import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { tokenProvider } from '~/test/testUtils';
import { createServer } from '~/infra/server';
import {
  ContactPoints,
  formatContactPointApi
} from '~/repositories/contactPointsRepository';
import {
  genContactPointApi,
  genEstablishmentApi,
  genGeoCode,
  genSettingsApi,
  genUserApi
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { ContactPointApi } from '~/models/ContactPointApi';
import { SettingsApi } from '~/models/SettingsApi';
import { formatSettingsApi, Settings } from '~/repositories/settingsRepository';

describe('Contact point API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const otherEstablishment = genEstablishmentApi();
  const otherUser = genUserApi(otherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, otherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert([user, otherUser].map(formatUserApi));
  });

  describe('GET /contact-points', () => {
    const testRoute = (establishmentId?: string) =>
      `/api/contact-points/${
        establishmentId ? '?establishmentId=' + establishmentId : ''
      }`;

    let contactPoints: ContactPointApi[];

    beforeAll(async () => {
      contactPoints = Array.from({ length: 3 }).map(() =>
        genContactPointApi(establishment.id)
      );
      await ContactPoints().insert(contactPoints.map(formatContactPointApi));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute(establishment.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid establishmentId', async () => {
      const { status } = await request(app)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list the contact points for an authenticated user', async () => {
      const anotherEstablishment = genEstablishmentApi();
      await Establishments().insert(
        formatEstablishmentApi(anotherEstablishment)
      );
      const anotherContactPoint = genContactPointApi(anotherEstablishment.id);
      await ContactPoints().insert(formatContactPointApi(anotherContactPoint));

      const { body, status } = await request(app)
        .get(testRoute(establishment.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toIncludeAllPartialMembers(contactPoints);
      expect(body).not.toPartiallyContain({
        id: anotherContactPoint.id
      });
    });
  });

  describe('GET /contact-points/public', () => {
    const testRoute = (establishmentId?: string) =>
      `/api/contact-points/public${
        establishmentId ? '?establishmentId=' + establishmentId : ''
      }`;

    let contactPoints: ContactPointApi[];

    beforeAll(async () => {
      contactPoints = Array.from({ length: 3 }).map(() =>
        genContactPointApi(establishment.id)
      );
      await ContactPoints().insert(contactPoints.map(formatContactPointApi));
    });

    it('should received a valid establishmentId', async () => {
      const { status } = await request(app).get(testRoute('id'));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should not list the contact points to public when establishment settings do not allow it', async () => {
      const settings: SettingsApi = {
        ...genSettingsApi(establishment.id),
        contactPoints: {
          public: false
        }
      };
      await Settings().insert(formatSettingsApi(settings));

      const { body, status } = await request(app).get(
        testRoute(establishment.id)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).not.toIncludeAllPartialMembers(contactPoints);
    });

    it('should list the contact points to public when establishment settings allow it', async () => {
      const res = await request(app)
        .get(testRoute(otherEstablishment.id))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject([]);
    });
  });

  describe('POST /contact-points', () => {
    const testRoute = '/api/contact-points';

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received valid parameters', async () => {
      await request(app)
        .post(testRoute)
        .send({})
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          geoCodes: [genGeoCode()]
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          title: randomstring.generate()
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          title: randomstring.generate(),
          geoCodes: [genGeoCode()],
          email: randomstring.generate()
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should create the contact point', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, establishmentId, ...payload } = genContactPointApi(
        establishment.id
      );

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject(payload);

      const actual = await ContactPoints().where({ id: body.id }).first();
      expect(actual).toBeDefined();
    });
  });

  describe('PUT /contact-points/{id}', () => {
    const testRoute = (id: string) => `/api/contact-points/${id}`;

    let contactPoint: ContactPointApi;

    beforeAll(async () => {
      contactPoint = genContactPointApi(establishment.id);
      await ContactPoints().insert(formatContactPointApi(contactPoint));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute(uuidv4()));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be missing for a user from another establishment', async () => {
      const anotherEstablishment = genEstablishmentApi();
      await Establishments().insert(
        formatEstablishmentApi(anotherEstablishment)
      );
      const anotherContactPoint = genContactPointApi(anotherEstablishment.id);
      await ContactPoints().insert(formatContactPointApi(anotherContactPoint));

      const { status } = await request(app)
        .put(testRoute(anotherContactPoint.id))
        .send(anotherContactPoint)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be missing', async () => {
      const { status } = await request(app)
        .put(testRoute(uuidv4()))
        .send(genContactPointApi(establishment.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received valid parameters', async () => {
      await request(app)
        .put(testRoute('id'))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(contactPoint.id))
        .send({
          email: randomstring.generate()
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should update the contact point', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, establishmentId, ...payload } = genContactPointApi(
        establishment.id
      );

      const { body, status } = await request(app)
        .put(testRoute(contactPoint.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: contactPoint.id,
        title: payload.title,
        email: payload.email
      });

      const actual = await ContactPoints()
        .where({
          id: contactPoint.id
        })
        .first();
      expect(actual).toBeDefined();
    });

    describe('DELETE /contact-points/{id}', () => {
      const testRoute = (id: string) => `/api/contact-points/${id}`;

      it('should be forbidden for a not authenticated user', async () => {
        const { status } = await request(app).delete(testRoute(uuidv4()));

        expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
      });

      it('should be missing', async () => {
        const { status } = await request(app)
          .delete(testRoute(uuidv4()))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
      });

      it('should be impossible to remove a contact point of another establishment', async () => {
        const anotherEstablishment = genEstablishmentApi();
        await Establishments().insert(
          formatEstablishmentApi(anotherEstablishment)
        );
        const anotherContactPoint = genContactPointApi(anotherEstablishment.id);
        await ContactPoints().insert(
          formatContactPointApi(anotherContactPoint)
        );

        const { status } = await request(app)
          .delete(testRoute(anotherContactPoint.id))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
      });

      it('should received a valid contact point id', async () => {
        const { status } = await request(app)
          .delete(testRoute('id'))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      });

      it('should delete the contact point', async () => {
        const { status } = await request(app)
          .delete(testRoute(contactPoint.id))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

        const actual = await ContactPoints()
          .where({ id: contactPoint.id })
          .first();
        expect(actual).toBeUndefined();
      });
    });
  });
});
