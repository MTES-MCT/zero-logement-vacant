import { isValid } from 'date-fns';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { DatafoncierOwner, isNotNull } from '@zerologementvacant/shared';
import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';
import { DatafoncierOwners } from '~/repositories/datafoncierOwnersRepository';
import { OwnerApi } from '~/models/OwnerApi';
import {
  formatHousingRecordApi,
  Housing,
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
  genHousingApi,
} from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  const datafoncierHouses = Array.from({ length: 10 }, () =>
    genDatafoncierHousing(),
  );
  await DatafoncierHouses(knex).insert(datafoncierHouses);

  const datafoncierOwners = datafoncierHouses.flatMap((housing) =>
    Array.from({ length: 6 }, () => genDatafoncierOwner(housing.idprocpte)),
  );
  await DatafoncierOwners(knex).insert(datafoncierOwners);

  const houses = Array.from({ length: datafoncierHouses.length }, () =>
    genHousingApi(),
  ).map((housing, i) => ({
    ...housing,
    localId: datafoncierHouses[i].idlocal,
  }));
  await Housing(knex).insert(houses.map(formatHousingRecordApi));

  const owners: OwnerApi[] = datafoncierOwners.map(toOwnerApi);
  await Owners(knex).insert(owners.map(formatOwnerApi));
}

function toOwnerApi(owner: DatafoncierOwner): OwnerApi {
  const kinds: Record<string, string> = {
    'PERSONNE PHYSIQUE': 'Particulier',
    'INVESTISSEUR PROFESSIONNEL': 'Investisseur',
    'SOCIETE CIVILE A VOCATION IMMOBILIERE': 'SCI',
  };

  const birthdate = owner.jdatnss
    ? new Date(owner.jdatnss.split('/').reverse().join('-'))
    : undefined;

  return {
    id: uuidv4(),
    rawAddress: [owner.dlign3, owner.dlign4, owner.dlign5, owner.dlign6].filter(
      isNotNull,
    ),
    fullName:
      owner.catpro2txt === 'PERSONNE PHYSIQUE'
        ? owner.ddenom.replace('/', ' ')
        : owner.ddenom,
    birthDate: isValid(birthdate) ? birthdate : undefined,
    kind: kinds[owner.catpro2txt] ?? 'Autre',
    kindDetail: owner.catpro3txt,
  };
}
