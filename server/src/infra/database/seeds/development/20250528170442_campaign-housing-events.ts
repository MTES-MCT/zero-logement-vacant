import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';

import { CampaignHousingEventApi } from '~/models/EventApi';
import {
  CampaignHousingDBO,
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import {
  CAMPAIGN_HOUSING_EVENTS_TABLE,
  EVENTS_TABLE,
  formatCampaignHousingEventApi,
  formatEventApi
} from '~/repositories/eventRepository';
import { genEventApi } from '~/test/testFixtures';

import { batchedWhereIn, getAdmin, getHousings } from './lib/events-helpers';

export async function seed(knex: Knex): Promise<void> {
  console.time('20250528170442_campaign-housing-events');
  const admin = await getAdmin(knex);
  const { housingKeys } = await getHousings(knex);

  const campaignHousings: ReadonlyArray<CampaignHousingDBO> =
    await batchedWhereIn<CampaignHousingDBO>(
      knex,
      (k) => CampaignsHousing(k),
      ['housing_geo_code', 'housing_id'],
      housingKeys
    );

  const campaignHousingEvents: ReadonlyArray<CampaignHousingEventApi> =
    faker.helpers
      .arrayElements(campaignHousings)
      .flatMap((campaignHousing): CampaignHousingEventApi[] => {
        return [
          {
            ...genEventApi({
              creator: admin,
              type: 'housing:campaign-attached',
              nextOld: null,
              nextNew: {
                name: faker.company.name()
              }
            }),
            campaignId: campaignHousing.campaign_id,
            housingGeoCode: campaignHousing.housing_geo_code,
            housingId: campaignHousing.housing_id
          },
          {
            ...genEventApi({
              creator: admin,
              type: 'housing:campaign-detached',
              nextOld: {
                name: faker.company.name()
              },
              nextNew: null
            }),
            campaignId: campaignHousing.campaign_id,
            housingGeoCode: campaignHousing.housing_geo_code,
            housingId: campaignHousing.housing_id
          },
          {
            ...genEventApi({
              creator: admin,
              type: 'housing:campaign-removed',
              nextOld: {
                name: faker.company.name()
              },
              nextNew: null
            }),
            campaignId: campaignHousing.campaign_id,
            housingGeoCode: campaignHousing.housing_geo_code,
            housingId: campaignHousing.housing_id
          }
        ];
      });

  console.log(
    `Inserting ${campaignHousingEvents.length} campaign housing events...`
  );
  await knex.batchInsert(
    EVENTS_TABLE,
    campaignHousingEvents.map(formatEventApi)
  );
  console.log(
    `Linking ${campaignHousingEvents.length} events to housings and campaigns...`
  );
  await knex.batchInsert(
    CAMPAIGN_HOUSING_EVENTS_TABLE,
    campaignHousingEvents.map(formatCampaignHousingEventApi)
  );
  console.timeEnd('20250528170442_campaign-housing-events');
  console.log('\n')
}
