import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserApi } from '~/models/UserApi';
import campaignHousingRepository, {
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import { toHousingInsert } from '~/repositories/housingRepository';
import { factories } from '~/test/factories';
import { genHousingApi } from '~/test/testFixtures';

describe('Campaign housing repository', () => {
  let establishment: EstablishmentApi;
  let creator: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    creator = await factories.user.create({
      establishmentId: establishment.id
    });
  });

  describe('removeMany', () => {
    it('should remove housings from a campaign', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: creator } });
      const housings = await factories.housing.createList(3);
      const slice = housings.slice(0, 1);

      await campaignHousingRepository.removeMany(campaign, slice);

      const campaignHousings = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(campaignHousings).toBeArrayOfSize(0);
    });

    it('should do nothing and leave count unchanged when housing list is empty', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: creator } });
      const housings = await factories.housing.createList(3);
      await kysely
        .insertInto('campaignsHousing')
        .values(
          housings.map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      const rowsBefore = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();

      await campaignHousingRepository.removeMany(campaign, []);

      const rowsAfter = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();

      expect(rowsAfter).toHaveLength(rowsBefore.length);
    });

    it('should remove only the specified subset, leaving others intact', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: creator } });
      const housings = await factories.housing.createList(3);
      await campaignHousingRepository.insertHousingList(campaign.id, housings);

      const toRemove = housings.slice(0, 1);
      const toKeep = housings.slice(1);

      await campaignHousingRepository.removeMany(campaign, toRemove);

      const remaining = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      const remainingIds = remaining.map((row) => row.housingId);
      expect(remainingIds).not.toContain(toRemove[0].id);
      toKeep.forEach((housing) => {
        expect(remainingIds).toContain(housing.id);
      });
    });
  });

  describe('insertHousingList', () => {
    it('should insert one row per housing with correct fields', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: creator } });
      const housings = await factories.housing.createList(3);

      await campaignHousingRepository.insertHousingList(campaign.id, housings);

      const rows = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(rows).toBeArrayOfSize(housings.length);
      housings.forEach((housing) => {
        const row = rows.find((r) => r.housingId === housing.id);
        expect(row).toBeDefined();
        expect(row?.housingGeoCode).toBe(housing.geoCode);
        expect(row?.campaignId).toBe(campaign.id);
      });
    });

    it('should deduplicate rows when called twice with the same housings', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: creator } });
      const housings = await factories.housing.createList(3);

      await campaignHousingRepository.insertHousingList(campaign.id, housings);
      await campaignHousingRepository.insertHousingList(campaign.id, housings);

      const rows = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(rows).toBeArrayOfSize(housings.length);
    });

    // Exercises the chunked insert across a batch boundary. The real-world bug
    // this guards against (a single unchunked INSERT exceeding Postgres's
    // 65535 bind-parameter limit around ~21,845 housings) only reproduces at a
    // scale unfit for a test suite; this proves the chunking itself is
    // correct — no row dropped or duplicated at the INSERT_BATCH_SIZE seam.
    it('should insert every row when the list spans multiple batches', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: creator } });
      const housings = faker.helpers.multiple(() => genHousingApi(), {
        count: 1200
      });
      for (let index = 0; index < housings.length; index += 500) {
        await kysely
          .insertInto('fastHousing')
          .values(housings.slice(index, index + 500).map(toHousingInsert))
          .execute();
      }

      await campaignHousingRepository.insertHousingList(campaign.id, housings);

      const rows = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(rows).toBeArrayOfSize(housings.length);
    }, 30_000);
  });

  describe('formatCampaignHousingApi', () => {
    it('should map housing.id, housing.geoCode, and campaign.id to DBO fields', () => {
      const campaign = { id: faker.string.uuid() };
      const housings = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );

      const result = formatCampaignHousingApi(campaign, housings);

      expect(result).toBeArrayOfSize(housings.length);
      housings.forEach((housing, index) => {
        expect(result[index]).toMatchObject({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        });
      });
    });

    it('should return an empty array when housing list is empty', () => {
      const campaign = { id: faker.string.uuid() };

      const result = formatCampaignHousingApi(campaign, []);

      expect(result).toBeArrayOfSize(0);
    });
  });
});
