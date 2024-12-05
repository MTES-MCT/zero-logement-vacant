import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import async from 'async';
import { Knex } from 'knex';
import { ElementOf, MarkRequired } from 'ts-essentials';

import { AddressKinds } from '@zerologementvacant/models';
import { Establishments } from '~/repositories/establishmentRepository';
import { HousingApi } from '~/models/HousingApi';
import { genHousingApi, genOwnerApi } from '~/test/testFixtures';
import {
  formatHousingRecordApi,
  housingTable
} from '~/repositories/housingRepository';
import { OwnerApi } from '~/models/OwnerApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { formatOwnerApi, ownerTable } from '~/repositories/ownerRepository';
import {
  formatHousingOwnerApi,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { createBanAPI } from '~/services/ban/ban-api';
import {
  banAddressesTable,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import { AddressApi } from '~/models/AddressApi';
import fp from 'lodash/fp';

export async function seed(knex: Knex): Promise<void> {
  const ban = createBanAPI();

  await knex.raw(`TRUNCATE TABLE ${housingOwnersTable} CASCADE`);
  await knex.raw(`TRUNCATE TABLE ${housingTable} CASCADE`);
  await knex.raw(`TRUNCATE TABLE ${ownerTable} CASCADE`);

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const geoCodes = faker.helpers.arrayElements(
      establishment.localities_geo_code,
      30
    );
    const baseHousings: HousingApi[] = faker.helpers.multiple(
      () => genHousingApi(faker.helpers.arrayElement(geoCodes)),
      {
        count: {
          min: 100,
          max: 10000
        }
      }
    );

    const geolocatedHousings: ReadonlyArray<
      MarkRequired<HousingApi, 'longitude' | 'latitude'>
    > = await async.mapLimit(
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

    // Infer housing addresses using the generated coordinates
    const points = geolocatedHousings.map((housing) => ({
      refId: housing.id,
      geoCode: housing.geoCode,
      longitude: housing.longitude,
      latitude: housing.latitude
    }));
    const addresses = await ban.reverseMany(points).then((addresses) => {
      return addresses.filter((address) => !!address.label);
    });
    const housings = geolocatedHousings
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

    // Insert housings
    console.log(`Inserting ${housings.length} housings...`, {
      establishment: establishment.name
    });
    await knex.batchInsert(housingTable, housings.map(formatHousingRecordApi));

    // Insert BAN housing addresses
    const housingAddresses: ReadonlyArray<AddressApi> = addresses.map(
      (address) => ({ ...address, addressKind: AddressKinds.Housing })
    );
    console.log(
      `Inserting ${housingAddresses.length} BAN housing addresses...`,
      { establishment: establishment.name }
    );
    await knex.batchInsert(
      banAddressesTable,
      housingAddresses.map(formatAddressApi)
    );

    const housingOwners: ReadonlyArray<HousingOwnerApi> = housings.flatMap(
      (housing) => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: {
            min: 1,
            max: 6
          }
        });
        const archivedOwners: ReadonlyArray<HousingOwnerApi> = [];

        return owners
          .map<HousingOwnerApi>((owner, index) => ({
            ...owner,
            ownerId: owner.id,
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            rank: index + 1
          }))
          .concat(archivedOwners);
      }
    );
    const owners: ReadonlyArray<OwnerApi> = housingOwners.flat();
    console.log(`Inserting ${owners.length} owners...`, {
      establishment: establishment.name
    });
    await knex.batchInsert(ownerTable, owners.map(formatOwnerApi));

    console.log(`Inserting ${housingOwners.length} housing owners...`, {
      establishment: establishment.name
    });
    await knex.batchInsert(
      housingOwnersTable,
      housingOwners.map(formatHousingOwnerApi)
    );
  });
}

async function perimeter(
  geoCode: string
): Promise<Feature<Polygon | MultiPolygon>> {
  const response = await fetch(
    `https://geo.api.gouv.fr/communes/${geoCode}?format=geojson&geometry=contour`
  );
  if (!response.ok) {
    const error = await response.json();
    console.log(error);
    throw new Error('Failed to fetch geojson');
  }

  const perimeter = await response.json();
  return perimeter as Feature<Polygon | MultiPolygon>;
}

// Memoize this function to avoid fetching the same perimeter multiple times
// and running out of requests on geo.api.gouv.fr
const fetchPerimeter = fp.memoize(perimeter);

function generatePointInside(perimeter: Polygon | MultiPolygon): Position {
  function generate(): Position {
    const bbox = turf.bbox(perimeter);
    const point = turf.randomPosition(bbox);
    return turf.booleanPointInPolygon(point, perimeter) ? point : generate();
  }
  return generate();
}
