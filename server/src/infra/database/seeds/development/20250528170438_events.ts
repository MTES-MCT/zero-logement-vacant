import { faker } from '@faker-js/faker/locale/fr';
import {
  EventType,
  HOUSING_STATUS_VALUES,
  OCCUPANCY_VALUES,
  OWNER_RANKS
} from '@zerologementvacant/models';
import { Knex } from 'knex';

import {
  CampaignHousingEventApi,
  EventApi,
  GroupHousingEventApi,
  HousingEventApi,
  HousingOwnerEventApi,
  OwnerEventApi,
  PrecisionHousingEventApi
} from '~/models/EventApi';
import {
  CampaignHousingDBO,
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import {
  CAMPAIGN_HOUSING_EVENTS_TABLE,
  EVENTS_TABLE,
  formatCampaignHousingEventApi,
  formatEventApi,
  formatGroupHousingEventApi,
  formatHousingEventApi,
  formatHousingOwnerEventApi,
  formatOwnerEventApi,
  formatPrecisionHousingEventApi,
  GROUP_HOUSING_EVENTS_TABLE,
  HOUSING_EVENTS_TABLE,
  HOUSING_OWNER_EVENTS_TABLE,
  OWNER_EVENTS_TABLE,
  PRECISION_HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import { GroupHousingDBO, GroupsHousing } from '~/repositories/groupRepository';
import {
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { Housing } from '~/repositories/housingRepository';
import { OwnerDBO, Owners } from '~/repositories/ownerRepository';
import {
  HOUSING_PRECISION_TABLE,
  HousingPrecisionDBO,
  HousingPrecisions,
  PRECISION_TABLE,
  PrecisionDBO
} from '~/repositories/precisionRepository';
import { Users } from '~/repositories/userRepository';
import { genEventApi } from '~/test/testFixtures';

const LIMIT = Number.MAX_SAFE_INTEGER;

export async function seed(knex: Knex): Promise<void> {
  const admin = await Users(knex)
    .where({ email: 'admin@zerologementvacant.beta.gouv.fr' })
    .first();
  if (!admin) {
    throw new Error('admin@zerologementvacant.beta.gouv.fr not found');
  }

  await knex.raw(`TRUNCATE TABLE ${EVENTS_TABLE} CASCADE`);

  const establishments = await Establishments(knex).where({ available: true });
  const geoCodes = establishments
    .map((establishment) => establishment.localities_geo_code)
    .flat();
  const housings = await Housing(knex)
    .whereIn('geo_code', geoCodes)
    .limit(LIMIT);
  const housingEvents: ReadonlyArray<HousingEventApi> = faker.helpers
    .arrayElements(housings)
    .map((housing) => {
      const events: ReadonlyArray<HousingEventApi> = [
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:created',
            nextOld: null,
            nextNew: {
              source: housing.data_file_years?.length
                ? housing.data_file_years[0]
                : 'datafoncier-manual'
            }
          }),
          housingGeoCode: housing.geo_code,
          housingId: housing.id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:occupancy-updated',
            nextOld: {
              occupancy: faker.helpers.arrayElement(
                OCCUPANCY_VALUES.filter(
                  (occupancy) => occupancy !== housing.occupancy
                )
              )
            },
            nextNew: {
              occupancy: housing.occupancy
            }
          }),
          housingGeoCode: housing.geo_code,
          housingId: housing.id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:status-updated',
            nextOld: {
              status: faker.helpers.arrayElement(
                HOUSING_STATUS_VALUES.filter(
                  (status) => status !== housing.status
                )
              )
            },
            nextNew: {
              status: housing.status
            }
          }),
          housingGeoCode: housing.geo_code,
          housingId: housing.id
        }
      ];
      return faker.helpers.arrayElements(events, {
        min: 1,
        max: events.length
      });
    })
    .flat();

  const housingPrecisions: ReadonlyArray<PrecisionDBO & HousingPrecisionDBO> =
    await HousingPrecisions(knex)
      .whereIn(
        ['housing_geo_code', 'housing_id'],
        housings.map((housing) => [housing.geo_code, housing.id])
      )
      .join(
        PRECISION_TABLE,
        `${PRECISION_TABLE}.id`,
        `${HOUSING_PRECISION_TABLE}.precision_id`
      );
  const precisionHousingEvents: ReadonlyArray<PrecisionHousingEventApi> =
    faker.helpers
      .arrayElements(housingPrecisions)
      .flatMap<PrecisionHousingEventApi>((housingPrecision) => {
        return [
          {
            ...genEventApi({
              creator: admin,
              type: 'housing:precision-attached',
              nextOld: null,
              nextNew: {
                category: housingPrecision.category,
                label: housingPrecision.label
              }
            }),
            precisionId: housingPrecision.precision_id,
            housingGeoCode: housingPrecision.housing_geo_code,
            housingId: housingPrecision.housing_id
          },
          {
            ...genEventApi({
              creator: admin,
              type: 'housing:precision-detached',
              nextOld: {
                category: housingPrecision.category,
                label: housingPrecision.label
              },
              nextNew: null
            }),
            precisionId: housingPrecision.precision_id,
            housingGeoCode: housingPrecision.housing_geo_code,
            housingId: housingPrecision.housing_id
          }
        ];
      });

  const housingOwners: ReadonlyArray<HousingOwnerDBO> = await HousingOwners(
    knex
  ).whereIn(
    ['housing_geo_code', 'housing_id'],
    housings.map((housing) => [housing.geo_code, housing.id])
  );
  const housingOwnerEvents: ReadonlyArray<HousingOwnerEventApi> = faker.helpers
    .arrayElements(housingOwners)
    .flatMap((housingOwner): HousingOwnerEventApi[] => {
      return [
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:owner-attached',
            nextOld: null,
            nextNew: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            }
          }),
          ownerId: housingOwner.owner_id,
          housingGeoCode: housingOwner.housing_geo_code,
          housingId: housingOwner.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:owner-updated',
            nextOld: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            },
            nextNew: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            }
          }),
          ownerId: housingOwner.owner_id,
          housingGeoCode: housingOwner.housing_geo_code,
          housingId: housingOwner.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:owner-detached',
            nextOld: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            },
            nextNew: null
          }),
          ownerId: housingOwner.owner_id,
          housingGeoCode: housingOwner.housing_geo_code,
          housingId: housingOwner.housing_id
        }
      ];
    });

  const groupHousings: ReadonlyArray<GroupHousingDBO> = await GroupsHousing(
    knex
  ).whereIn(
    ['housing_geo_code', 'housing_id'],
    housings.map((housing) => [housing.geo_code, housing.id])
  );
  const groupHousingEvents: ReadonlyArray<GroupHousingEventApi> = faker.helpers
    .arrayElements(groupHousings)
    .flatMap((groupHousing): GroupHousingEventApi[] => {
      return [
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-attached',
            nextOld: null,
            nextNew: {
              name: faker.company.name()
            }
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-detached',
            nextOld: {
              name: faker.company.name()
            },
            nextNew: null
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-archived',
            nextOld: {
              name: faker.company.name()
            },
            nextNew: null
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-removed',
            nextOld: {
              name: faker.company.name()
            },
            nextNew: null
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        }
      ];
    });

  const campaignHousings: ReadonlyArray<CampaignHousingDBO> =
    await CampaignsHousing(knex).whereIn(
      ['housing_geo_code', 'housing_id'],
      housings.map((housing) => [housing.geo_code, housing.id])
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

  const owners: ReadonlyArray<OwnerDBO> = await Owners().limit(LIMIT);
  const ownerEvents: ReadonlyArray<OwnerEventApi> = faker.helpers
    .arrayElements(owners)
    .flatMap((owner): OwnerEventApi[] => {
      return [
        {
          ...genEventApi({
            creator: admin,
            type: 'owner:updated',
            nextOld: {
              name: faker.person.fullName(),
              birthdate: faker.date.birthdate().toJSON()
            },
            nextNew: {
              name: owner.full_name,
              birthdate: owner.birth_date
                ? new Date(owner.birth_date).toJSON()
                : null
            }
          }),
          ownerId: owner.id
        }
      ];
    });

  const events: ReadonlyArray<EventApi<EventType>> = [
    ...housingEvents,
    ...precisionHousingEvents,
    ...housingOwnerEvents,
    ...groupHousingEvents,
    ...campaignHousingEvents,
    ...ownerEvents
  ];

  console.log(`Creating ${events.length} events...`);
  await knex.batchInsert(EVENTS_TABLE, events.map(formatEventApi));
  console.log(`Linking ${housingEvents.length} events to housings...`);
  await knex.batchInsert(
    HOUSING_EVENTS_TABLE,
    housingEvents.map(formatHousingEventApi)
  );
  console.log(
    `Linking ${precisionHousingEvents.length} events to housings and precisions...`
  );
  await knex.batchInsert(
    PRECISION_HOUSING_EVENTS_TABLE,
    precisionHousingEvents.map(formatPrecisionHousingEventApi)
  );
  console.log(
    `Linking ${housingOwnerEvents.length} events to housing owners...`
  );
  await knex.batchInsert(
    HOUSING_OWNER_EVENTS_TABLE,
    housingOwnerEvents.map(formatHousingOwnerEventApi)
  );
  console.log(
    `Linking ${groupHousingEvents.length} events to housings and groups...`
  );
  await knex.batchInsert(
    GROUP_HOUSING_EVENTS_TABLE,
    groupHousingEvents.map(formatGroupHousingEventApi)
  );
  console.log(
    `Linking ${campaignHousingEvents.length} events to housings and campaigns...`
  );
  await knex.batchInsert(
    CAMPAIGN_HOUSING_EVENTS_TABLE,
    campaignHousingEvents.map(formatCampaignHousingEventApi)
  );
  console.log(`Linking ${ownerEvents.length} events to owners...`);
  await knex.batchInsert(
    OWNER_EVENTS_TABLE,
    ownerEvents.map(formatOwnerEventApi)
  );
}
