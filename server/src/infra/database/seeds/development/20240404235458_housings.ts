import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import async from 'async';
import { Knex } from 'knex';

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

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`TRUNCATE TABLE ${housingTable} CASCADE`);

  const establishments = await Establishments(knex).where({ available: true });

  await async.forEachSeries(establishments, async (establishment) => {
    const id =
      establishment.kind === 'Commune'
        ? establishment.localities_geo_code[0]
        : establishment.siren;
    const kind = establishment.kind === 'Commune' ? 'communes' : 'epcis';
    const response = await fetch(
      `https://geo.api.gouv.fr/${kind}/${id}?format=geojson&geometry=contour`
    );
    if (!response.ok) {
      const error = await response.json();
      console.log(error);
      throw new Error('Failed to fetch geojson');
    }

    const epci = await response.json();
    const contour = (epci as Feature<Polygon | MultiPolygon>).geometry;

    const housings: ReadonlyArray<HousingApi> = faker.helpers
      .multiple(
        () =>
          genHousingApi(
            faker.helpers.arrayElement(establishment.localities_geo_code)
          ),
        {
          count: {
            min: 100,
            max: 10000
          }
        }
      )
      // Put the housing inside the establishment perimeter
      .map((housing) => {
        const point = generatePointInside(contour);
        return {
          ...housing,
          longitude: point[0],
          latitude: point[1]
        };
      });

    // TODO: Infer housing addresses using the generated coordinates

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

    await knex.batchInsert(housingTable, housings.map(formatHousingRecordApi));
    await knex.batchInsert(ownerTable, owners.map(formatOwnerApi));
    await knex.batchInsert(
      housingOwnersTable,
      housingOwners.map(formatHousingOwnerApi)
    );
  });
}

function generatePointInside(perimeter: Polygon | MultiPolygon): Position {
  function generate(): Position {
    const bbox = turf.bbox(perimeter);
    const point = turf.randomPosition(bbox);
    return turf.booleanPointInPolygon(point, perimeter) ? point : generate();
  }
  return generate();
}
