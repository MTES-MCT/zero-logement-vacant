import { faker } from '@faker-js/faker/locale/fr';
import {
  ENERGY_CONSUMPTION_MATCH_VALUES,
  ENERGY_CONSUMPTION_TYPE_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  type BuildingDTO
} from '@zerologementvacant/models';
import { Factory } from 'fishery';

import type { PersistenceAdapter } from '../persistence-adapter';

export function createBuildingFactory(adapter: PersistenceAdapter) {
  return Factory.define<BuildingDTO>(() => {
    const hasEnergyConsumption = faker.datatype.boolean({ probability: 0.8 });
    return {
      id:
        faker.location.zipCode() +
        faker.string.alphanumeric({ length: 7, casing: 'upper' }),
      housingCount: 0,
      vacantHousingCount: 0,
      rentHousingCount: 0,
      rnb: hasEnergyConsumption
        ? {
            id:
              faker.helpers.maybe(
                () =>
                  faker.string.alphanumeric({ casing: 'upper', length: 10 }),
                { probability: 0.9 }
              ) ?? null,
            score: faker.helpers.arrayElement([0, 1, 2, 3, 8, 9])
          }
        : null,
      dpe: hasEnergyConsumption
        ? {
            id: faker.string.alphanumeric({ casing: 'upper', length: 13 }),
            class: faker.helpers.arrayElement(ENERGY_CONSUMPTION_VALUES),
            doneAt: faker.date
              .past()
              .toJSON()
              .substring(0, 'yyyy-mm-dd'.length),
            type: faker.helpers.arrayElement(ENERGY_CONSUMPTION_TYPE_VALUES),
            match: faker.helpers.arrayElement(ENERGY_CONSUMPTION_MATCH_VALUES)
          }
        : null
    };
  }).onCreate((entity) => adapter.create('buildings', entity));
}
