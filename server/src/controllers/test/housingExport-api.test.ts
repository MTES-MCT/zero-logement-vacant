import { faker } from '@faker-js/faker/locale/fr';
import { constants } from 'http2';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { createServer } from '~/infra/server';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatGroupApi,
  Groups
} from '~/repositories/groupRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import {
  genCampaignApiNext,
  genEstablishmentApi,
  genGroupApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('Housing export API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('GET /groups/{id}/export', () => {
    const testRoute = (id: string): string => `/groups/${id}/export`;

    const group = genGroupApi(user, establishment);

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(group.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return 400 when :id is not a UUID', async () => {
      const { status, body } = await request(url)
        .get(testRoute('not-a-uuid'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ errors: expect.any(Array) });
    });

    it('should stream an XLSX workbook for an existing group', async () => {
      const { status, headers } = await request(url)
        .get(testRoute(group.id))
        .use(tokenProvider(user))
        .buffer(true);

      expect(status).toBe(constants.HTTP_STATUS_ACCEPTED);
      expect(headers['content-type']).toContain(XLSX_CONTENT_TYPE);
    });
  });

  describe('GET /campaigns/{id}/export', () => {
    const testRoute = (id: string): string => `/campaigns/${id}/export`;

    const group = genGroupApi(user, establishment);
    const campaign = genCampaignApiNext({
      group,
      creator: user,
      establishment
    });

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return 400 when :id is not a UUID', async () => {
      const { status, body } = await request(url)
        .get(testRoute('not-a-uuid'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/id/i);
    });

    it('should stream an XLSX workbook for an existing campaign', async () => {
      const { status, headers } = await request(url)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user))
        .buffer(true);

      expect(status).toBe(constants.HTTP_STATUS_ACCEPTED);
      expect(headers['content-type']).toContain(XLSX_CONTENT_TYPE);
    });
  });
});
