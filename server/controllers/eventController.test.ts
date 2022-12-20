import request from 'supertest';
import { constants } from 'http2';

import { createServer } from '../server';
import { genEventCreationDTO } from '../test/testFixtures';
import { withAccessToken } from '../test/testUtils';
import { Owner1 } from '../../database/seeds/test/004-owner';
import { Housing1, Housing2 } from '../../database/seeds/test/005-housing';

const { app } = createServer();

describe('Event controller', () => {
  describe('create', () => {
    const testRoute = '/api/events';

    it('should validate input', async () => {
      await withAccessToken(request(app).post(testRoute)).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...genEventCreationDTO(), title: '' })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...genEventCreationDTO(), housingId: 'housing' })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should create a owner event', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...genEventCreationDTO(),
            housingId: undefined,
            ownerId: Owner1.id,
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should create housing events', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...genEventCreationDTO(),
            housingId: [Housing1.id, Housing2.id],
            ownerId: Owner1.id,
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should fail if the owner does not exist', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...genEventCreationDTO(),
            housingId: undefined,
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail if any housing does not exist', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...genEventCreationDTO(),
            ownerId: Owner1.id,
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
