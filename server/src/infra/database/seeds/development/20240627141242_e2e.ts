import { faker } from '@faker-js/faker/locale/fr';
import bcrypt from 'bcryptjs';
import { Knex } from 'knex';

import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { SALT_LENGTH, UserApi, UserRoles } from '~/models/UserApi';
import config from '~/infra/config';

export async function seed(knex: Knex): Promise<void> {
  if (!config.e2e.email || !config.e2e.password) {
    throw new Error('You must provide E2E_EMAIL and E2E_PASSWORD');
  }

  const GEO_CODE = '13055';

  await Establishments()
    .where({ name: 'Zéro Logement Vacant à Marseille', })
    .delete();
  const establishment: EstablishmentApi = {
    ...genEstablishmentApi(GEO_CODE),
    name: 'Zéro Logement Vacant à Marseille',
    shortName: 'ZLV à Marseille',
    kind: 'EPCI',
  };
  await Establishments(knex).insert(formatEstablishmentApi(establishment));

  const email = config.e2e.email;
  const password = await bcrypt.hash(config.e2e.password, SALT_LENGTH);
  await Users(knex).where({ email, }).delete();
  const user: UserApi = {
    ...genUserApi(establishment.id),
    email,
    password,
    role: UserRoles.Usual,
  };
  await Users(knex).insert(formatUserApi(user));

  const owners = Array.from({ length: 100, }, () => genOwnerApi());
  await Owners(knex).insert(owners.map(formatOwnerApi));

  const housings = Array.from({ length: 200, }, () => genHousingApi(GEO_CODE));
  await Housing(knex).insert(housings.map(formatHousingRecordApi));

  const housingOwners: HousingOwnerDBO[] = housings.flatMap((housing) => {
    return faker.helpers
      .arrayElements(owners, { min: 1, max: 6, })
      .map<HousingOwnerDBO>((owner, index) => ({
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        owner_id: owner.id,
        rank: index + 1,
      }));
  });
  await HousingOwners(knex).insert(housingOwners);
}
