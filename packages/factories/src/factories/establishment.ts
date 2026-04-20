import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  ESTABLISHMENT_KIND_VALUES,
  ESTABLISHMENT_SOURCE_VALUES,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

export function createEstablishmentFactory(adapter: Adapter) {
  return Factory.define<EstablishmentDTO>(() => {
    const name = faker.location.city();
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
