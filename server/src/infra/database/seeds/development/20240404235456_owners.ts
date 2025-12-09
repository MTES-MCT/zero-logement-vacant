import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import { AddressKinds } from '@zerologementvacant/models';
import {
  MultiPolygon,
  Polygon,
  Position,
  type FeatureCollection
} from 'geojson';
import { Knex } from 'knex';

import { genGeoCode } from '@zerologementvacant/models/fixtures';
import async from 'async';
import {
  Addresses,
  banAddressesTable,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import { formatOwnerApi, ownerTable } from '~/repositories/ownerRepository';
import { createBanAPI } from '~/services/ban/ban-api';
import { genOwnerApi } from '~/test/testFixtures';
import { AddressApi } from '~/models/AddressApi';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`TRUNCATE TABLE ${ownerTable} CASCADE`);
  await Addresses(knex).where({ address_kind: AddressKinds.Owner }).delete();

  const ban = createBanAPI();
  const establishments = await Establishments(knex).where({ available: true });

  // Skip seeding if no establishments are available
  if (establishments.length === 0) {
    console.log('No available establishments found. Skipping owners seed.');
    return;
  }

  const departments = faker.helpers.multiple(
    () => genGeoCode().substring(0, 2),
    { count: 10 }
  );
  const allCommunesByDepartment: ReadonlyArray<
    FeatureCollection<Polygon | MultiPolygon>
  > = await async.map(departments, async (department: string) => {
    return fetchCommunes(department);
  });
  // Filter out empty FeatureCollections (from failed API calls)
  const communesByDepartment = allCommunesByDepartment.filter(
    (fc) => fc.features.length > 0
  );

  // Skip if no valid communes were fetched
  if (communesByDepartment.length === 0) {
    console.log('No valid communes fetched. Skipping owners seed.');
    return;
  }

  const owners = establishments.flatMap(() => {
    return faker.helpers.multiple(() => genOwnerApi(), {
      count: {
        min: 100,
        max: 5000
      }
    });
  });
  const points = owners.map((owner) => {
    const communes = faker.helpers.arrayElement(communesByDepartment);
    const commune = faker.helpers.arrayElement(communes.features);
    const point = generatePointInside(commune.geometry);
    return {
      refId: owner.id,
      geoCode: commune.properties?.code,
      longitude: point[0],
      latitude: point[1]
    };
  });
  const addresses = await ban
    .reverseMany(points)
    .then((addresses) => {
      return addresses.filter((address) => !!address.label);
    })
    .catch((error) => {
      console.error('Error during BAN reverse geocoding:', error);
      throw error;
    });

  console.log(`Inserting ${owners.length} owners...`);
  await knex.batchInsert(ownerTable, owners.map(formatOwnerApi));

  console.log(`Inserting ${addresses.length} addresses...`);
  console.log(`Linking addresses to owners...`);
  const ownerAddresses = addresses.map<AddressApi>((address) => ({
    ...address,
    addressKind: AddressKinds.Owner,
    banId: address.id,
    score: faker.number.float({ min: 0, max: 1, multipleOf: 0.01 })
  }));
  await knex.batchInsert(
    banAddressesTable,
    ownerAddresses.map(formatAddressApi)
  );
}

async function fetchCommunes(
  department: string
): Promise<FeatureCollection<Polygon | MultiPolygon>> {
  const response = await fetch(
    `https://geo.api.gouv.fr/departements/${department}/communes?format=geojson&geometry=contour`
  );
  if (!response.ok) {
    console.warn(`Failed to fetch communes for department ${department}: ${response.status} ${response.statusText}`);
    // Return empty FeatureCollection instead of throwing
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  const perimeters = await response.json();
  return perimeters as FeatureCollection<Polygon | MultiPolygon>;
}

function generatePointInside(perimeter: Polygon | MultiPolygon): Position {
  function generate(): Position {
    const bbox = turf.bbox(perimeter);
    const point = turf.randomPosition(bbox);
    return turf.booleanPointInPolygon(point, perimeter) ? point : generate();
  }
  return generate();
}