import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import excel from 'exceljs';
import request from 'supertest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { CampaignApi } from '~/models/CampaignApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GroupApi } from '~/models/GroupApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { tokenProvider } from '~/test/testUtils';

function binaryParser(res: any, callback: (err: any, buffer: Buffer) => void) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => {
    data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
}

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

    it('should exclude housings whose primary owner refused to be contacted', async () => {
      const geoCode = faker.helpers.arrayElement(establishment.geoCodes);
      const contactableOwner = await factories.owner.create();
      const doNotContactOwner = await factories.owner.create({
        doNotContact: true
      });
      const contactableHousing = await factories.housing.create({ geoCode });
      const doNotContactHousing = await factories.housing.create({ geoCode });

      await factories
        .housingOwner({ housing: contactableHousing, owner: contactableOwner })
        .create({ rank: 1 });
      await factories
        .housingOwner({
          housing: doNotContactHousing,
          owner: doNotContactOwner
        })
        .create({ rank: 1 });

      await kysely
        .insertInto('campaignsHousing')
        .values(
          [contactableHousing, doNotContactHousing].map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      const response = await request(url)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user))
        .buffer()
        .parse(binaryParser);

      expect(response.status).toBe(constants.HTTP_STATUS_ACCEPTED);
      const workbook = new excel.Workbook();
      await workbook.xlsx.load(response.body);
      const worksheet = workbook.getWorksheet('Logements');
      const headerRow = worksheet!.getRow(1);
      let localIdColumn = 0;
      headerRow.eachCell((cell, colNumber) => {
        if (cell.text === 'Identifiant fiscal national') {
          localIdColumn = colNumber;
        }
      });
      const localIds: unknown[] = [];
      worksheet!.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }
        localIds.push(row.getCell(localIdColumn).value);
      });

      expect(localIds).toContain(contactableHousing.localId);
      expect(localIds).not.toContain(doNotContactHousing.localId);
    });
  });
});
