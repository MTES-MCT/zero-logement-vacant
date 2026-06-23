import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import {
  ACTIVE_OWNER_RANKS,
  AddressKinds,
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';
import async from 'async';
import { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { Knex } from 'knex';
import pMemoize from 'p-memoize';
import pRetry from 'p-retry';
import { ElementOf } from 'ts-essentials';

import { AddressApi } from '~/models/AddressApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import {
  banAddressesTable,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import { Buildings } from '~/repositories/buildingRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import {
  formatHousingOwnerApi,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  housingTable
} from '~/repositories/housingRepository';
import { Owners, parseOwnerApi } from '~/repositories/ownerRepository';
import { createBanAPI } from '~/services/ban/ban-api';
import { factories } from '~/test/factories';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235459_housings');
  const ban = createBanAPI();

  const [establishments, buildings, owners] = await Promise.all([
    Establishments(knex).where({ available: true }),
    Buildings(knex).limit(1000),
    Owners(knex)
      .select()
      .then((owners) => owners.map(parseOwnerApi))
  ]);

  const allHousings: HousingApi[] = [];
  const allHousingAddresses: AddressApi[] = [];
  const allHousingOwners: HousingOwnerApi[] = [];

  await async.forEachSeries(establishments, async (establishment) => {
    const geoCodes = faker.helpers.arrayElements(
      establishment.localities_geo_code,
      30
    );

    const baseHousings: HousingApi[] = faker.helpers.multiple(
      () =>
        factories.housing.build({
          buildingId: faker.helpers.arrayElement(buildings).id,
          geoCode: faker.helpers.arrayElement(geoCodes),
          status: HousingStatus.NEVER_CONTACTED,
          occupancy: Occupancy.VACANT,
          occupancyRegistered: Occupancy.VACANT,
          occupancyIntended: null
        }),
      {
        count: {
          min: 100,
          max: 5000
        }
      }
    );

    const geolocatedHousings = await async.mapLimit(
      baseHousings,
      8,
      async (housing: ElementOf<typeof baseHousings>) => {
        const geojson = await fetchPerimeter(housing.geoCode);
        const contour = geojson.geometry;
        const point = generatePointInside(contour);
        return {
          ...housing,
          longitude: point[0],
          latitude: point[1]
        };
      }
    );

    const points = geolocatedHousings.map((housing) => ({
      refId: housing.id,
      geoCode: housing.geoCode,
      longitude: housing.longitude,
      latitude: housing.latitude
    }));
    const addresses = await ban
      .reverseMany(points)
      .then((addresses) => {
        return addresses.filter((address) => !!address.label);
      })
      .catch((error) => {
        console.warn('Error during BAN reverse geocoding:', error);
        return [];
      });

    const addressedHousings = geolocatedHousings
      .filter((housing) => {
        return addresses.some(
          (address) =>
            address.refId === housing.id && address.geoCode === housing.geoCode
        );
      })
      .map<HousingApi>((housing, i) => {
        const address = addresses[i];
        if (address.refId !== housing.id) {
          throw new Error('Should never happen');
        }
        return {
          ...housing,
          longitude: address.longitude,
          latitude: address.latitude,
          rawAddress: [address.label]
        };
      });

    // Attach owners to each housing. The first selected owner is ranked 1 and
    // becomes the housing's displayed owner (read-side projection only — the
    // relationship is persisted through the housing_owners rows below).
    const housings = addressedHousings.map<HousingApi>((housing) => {
      const ownerCount = faker.number.int({
        min: 1,
        max: ACTIVE_OWNER_RANKS.length
      });
      const selectedOwners = faker.helpers.arrayElements(owners, ownerCount);
      const housingOwners = selectedOwners.map((owner, index) =>
        factories.housingOwner({ housing, owner }).build({
          rank: ACTIVE_OWNER_RANKS[index]
        })
      );
      allHousingOwners.push(...housingOwners);
      return { ...housing, owner: selectedOwners[0] };
    });

    console.log(
      `Generated ${housings.length} housings for ${establishment.name}`
    );

    const housingAddresses: ReadonlyArray<AddressApi> = addresses.map(
      (address) => ({ ...address, addressKind: AddressKinds.Housing })
    );

    allHousings.push(...housings);
    allHousingAddresses.push(...housingAddresses);
  });

  // All data generated — wipe and bulk-insert atomically
  await knex.raw(`TRUNCATE TABLE ${housingOwnersTable} CASCADE`);
  await knex.raw(`TRUNCATE TABLE ${housingTable} CASCADE`);

  console.log(`Inserting ${allHousings.length} housings...`);
  await knex.batchInsert(
    housingTable,
    allHousings.map(formatHousingRecordApi),
    100
  );

  if (allHousingAddresses.length > 0) {
    console.log(
      `Inserting ${allHousingAddresses.length} BAN housing addresses...`
    );
    await knex.batchInsert(
      banAddressesTable,
      allHousingAddresses.map(formatAddressApi)
    );
  }

  console.log(`Inserting ${allHousingOwners.length} housing owners...`);
  await knex.batchInsert(
    housingOwnersTable,
    allHousingOwners.map(formatHousingOwnerApi)
  );

  console.timeEnd('20240404235459_housings');
  console.log('\n');
}

async function perimeter(
  geoCode: string
): Promise<Feature<Polygon | MultiPolygon>> {
  return pRetry(
    async () => {
      const response = await fetch(
        `https://geo.api.gouv.fr/communes/${geoCode}?format=geojson&geometry=contour`
      );
      if (!response.ok) {
        console.warn(
          `Failed to fetch communes ${geoCode}: ${response.status} ${response.statusText}`
        );
        throw new Error('Failed to fetch geojson');
      }

      const perimeter = await response.json();
      return perimeter as Feature<Polygon | MultiPolygon>;
    },
    {
      retries: 10,
      maxRetryTime: 60_000
    }
  );
}

// Memoize this function to avoid fetching the same perimeter multiple times
// and running out of requests on geo.api.gouv.fr
const fetchPerimeter = pMemoize(perimeter);

function generatePointInside(perimeter: Polygon | MultiPolygon): Position {
  function generate(): Position {
    const bbox = turf.bbox(perimeter);
    const point = turf.randomPosition(bbox);
    return turf.booleanPointInPolygon(point, perimeter) ? point : generate();
  }
  return generate();
}
