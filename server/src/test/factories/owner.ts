import { faker } from '@faker-js/faker/locale/fr';
import { OWNER_ENTITY_VALUES } from '@zerologementvacant/models';
import { Factory } from 'fishery';

import { OwnerApi } from '~/models/OwnerApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createOwnerFactory(adapter: PersistenceAdapter) {
  return Factory.define<OwnerApi>(({ params }) => {
    const owner = dtoFactories.owner.build(params);
    return {
      ...owner,
      entity: faker.helpers.arrayElement([null, ...OWNER_ENTITY_VALUES])
    };
  }).onCreate((owner) => adapter.create('owners', owner));
}
