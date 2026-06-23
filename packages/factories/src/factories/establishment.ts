import { faker } from '@faker-js/faker/locale/fr';
import {
  ESTABLISHMENT_KIND_VALUES,
  ESTABLISHMENT_SOURCE_VALUES,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import { Factory } from 'fishery';

import type { PersistenceAdapter } from '../persistence-adapter';

export function createEstablishmentFactory(adapter: PersistenceAdapter) {
  return Factory.define<EstablishmentDTO>(({ params }) => {
    // Honour an overridden name so the short name defaults consistently to it.
    const name = params.name ?? faker.location.city();
    return {
      id: faker.string.uuid(),
      name,
      shortName: name,
      siren: faker.string.numeric(9),
      available: true,
      geoCodes: faker.helpers.multiple(() => faker.location.zipCode(), {
        count: { min: 1, max: 10 }
      }),
      kind: faker.helpers.arrayElement(ESTABLISHMENT_KIND_VALUES),
      source: faker.helpers.arrayElement(ESTABLISHMENT_SOURCE_VALUES)
    };
  }).onCreate((entity) => adapter.create('establishments', entity));
}
