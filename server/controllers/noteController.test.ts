import request from 'supertest';
import { constants } from 'http2';

import { createServer } from '../server';
import { genNoteCreationDTO } from '../test/testFixtures';
import { withAccessToken } from '../test/testUtils';
import { Owner1 } from '../../database/seeds/test/004-owner';
import { Housing1, Housing2 } from '../../database/seeds/test/005-housing';

const { app } = createServer();

describe('Note controller', () => {
  describe('create', () => {
    const testRoute = '/api/notes';

    it('should validate input', async () => {
      await withAccessToken(request(app).post(testRoute)).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...genNoteCreationDTO(), title: '' })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...genNoteCreationDTO(), housingIds: 'housing' })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should create a owner note', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...genNoteCreationDTO(),
            housingIds: undefined,
            ownerId: Owner1.id,
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should create housing notes', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...genNoteCreationDTO(),
            housingIds: [Housing1.id, Housing2.id],
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
            ...genNoteCreationDTO(),
            housingIds: undefined,
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail if any housing does not exist', async () => {
      const { status } = await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...genNoteCreationDTO(),
            ownerId: Owner1.id,
          })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
