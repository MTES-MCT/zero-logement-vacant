import { Knex } from 'knex';
import { DatafoncierOwners } from '../../../repositories/datafoncierOwnersRepository';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
  genHousingApi,
} from '../../../test/testFixtures';
import { DatafoncierHouses } from '../../../repositories/datafoncierHousingRepository';
import {
  formatHousingRecordApi,
  Housing,
} from '../../../repositories/housingRepository';
import { OwnerApi } from '../../../models/OwnerApi';
import { toOwnerApi } from '../../../scripts/shared';
import { formatOwnerApi, Owners } from '../../../repositories/ownerRepository';

exports.seed = async (knex: Knex) => {
  const datafoncierHouses = new Array(10)
    .fill(0)
    .map(() => genDatafoncierHousing());
  await DatafoncierHouses(knex).insert(datafoncierHouses);

  const datafoncierOwners = datafoncierHouses.flatMap((housing) =>
    new Array(6).fill(0).map(() => genDatafoncierOwner(housing.idprocpte))
  );
  await DatafoncierOwners(knex).insert(datafoncierOwners);

  const houses = new Array(datafoncierHouses.length)
    .fill(0)
    .map(() => genHousingApi())
    .map((housing, i) => ({
      ...housing,
      localId: datafoncierHouses[i].idlocal,
    }));
  await Housing(knex).insert(houses.map(formatHousingRecordApi));

  const owners: OwnerApi[] = datafoncierOwners.map(toOwnerApi);
  await Owners(knex).insert(owners.map(formatOwnerApi));
};
