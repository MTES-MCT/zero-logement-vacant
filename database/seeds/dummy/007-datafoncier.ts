import { Knex } from 'knex';
import { DatafoncierOwners } from '../../../server/repositories/datafoncierOwnersRepository';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
  genHousingApi,
  oneOf,
} from '../../../server/test/testFixtures';
import { DatafoncierHouses } from '../../../server/repositories/datafoncierHousingRepository';
import {
  formatHousingRecordApi,
  Housing,
} from '../../../server/repositories/housingRepository';
import { OwnerApi } from '../../../server/models/OwnerApi';
import { toOwnerApi } from '../../../scripts/shared';
import {
  formatOwnerApi,
  Owners,
} from '../../../server/repositories/ownerRepository';

exports.seed = async (knex: Knex) => {
  const establishments = await knex('establishments').where({
    available: true,
  });
  const geoCodes = establishments.flatMap(
    (establishment) => establishment.localities_geo_code
  );

  const datafoncierHouses = Array.from({ length: 10 }, () =>
    genDatafoncierHousing(oneOf(geoCodes))
  );
  await DatafoncierHouses(knex).insert(datafoncierHouses);

  const datafoncierOwners = datafoncierHouses.flatMap((housing) =>
    Array.from({ length: 6 }, () => genDatafoncierOwner(housing.idprocpte))
  );
  await DatafoncierOwners(knex).insert(datafoncierOwners);

  const houses = Array.from({ length: datafoncierHouses.length / 2 }, () =>
    genHousingApi(oneOf(geoCodes))
  ).map((housing, i) => ({
    ...housing,
    localId: datafoncierHouses[i].idlocal,
  }));
  await Housing(knex).insert(houses.map(formatHousingRecordApi));

  const owners: OwnerApi[] = datafoncierOwners.map(toOwnerApi);
  await Owners(knex).insert(owners.map(formatOwnerApi));
};
