import { constants } from 'http2';

import request from 'supertest';

import { createServer } from '~/infra/server';
import { CampaignApi } from '~/models/CampaignApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GroupApi } from '~/models/GroupApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { tokenProvider } from '~/test/testUtils';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('Housing export API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('GET /groups/{id}/export', () => {
    const testRoute = (id: string): string => `/groups/${id}/export`;

    let group: GroupApi;

    beforeAll(async () => {
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
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
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/id/i);
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

    let group: GroupApi;
    let campaign: CampaignApi;

    beforeAll(async () => {
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      campaign = await factories
        .campaign(establishment)
        .create({ groupId: group.id }, { associations: { createdBy: user } });
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
