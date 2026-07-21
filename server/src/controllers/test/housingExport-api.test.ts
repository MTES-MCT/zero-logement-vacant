import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import excel from 'exceljs';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { fromCampaignDTO } from '~/models/CampaignApi';
import {
  CampaignsHousing,
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatGroupApi, Groups } from '~/repositories/groupRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { factories } from '~/test/factories';
import {
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';
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

    const group = genGroupApi(user, establishment);
    const campaign = factories
      .campaign(establishment)
      .build({ groupId: group.id }, { associations: { createdBy: user } });

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
      await Campaigns().insert(
        formatCampaignApi(fromCampaignDTO(campaign, establishment))
      );
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
      const contactableOwner = genOwnerApi();
      const doNotContactOwner = { ...genOwnerApi(), doNotContact: true };
      const contactableHousing = genHousingApi(geoCode);
      const doNotContactHousing = genHousingApi(geoCode);

      await Owners().insert(
        [contactableOwner, doNotContactOwner].map(formatOwnerApi)
      );
      await Housing().insert(
        [contactableHousing, doNotContactHousing].map(formatHousingRecordApi)
      );
      await HousingOwners().insert([
        formatHousingOwnerApi({
          ...genHousingOwnerApi(contactableHousing, contactableOwner),
          rank: 1
        }),
        formatHousingOwnerApi({
          ...genHousingOwnerApi(doNotContactHousing, doNotContactOwner),
          rank: 1
        })
      ]);
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, [
          contactableHousing,
          doNotContactHousing
        ])
      );

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
