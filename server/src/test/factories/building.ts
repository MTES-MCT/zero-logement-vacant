import { faker } from '@faker-js/faker/locale/fr';
import { ENERGY_CONSUMPTION_VALUES } from '@zerologementvacant/models';
import { Factory } from 'fishery';

import { BuildingApi } from '~/models/BuildingApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createBuildingFactory(adapter: PersistenceAdapter) {
  return Factory.define<BuildingApi>(({ params }) => {
    const building = dtoFactories.building.build(params);
    return {
      ...building,
      ges: building.dpe
        ? { class: faker.helpers.arrayElement(ENERGY_CONSUMPTION_VALUES) }
        : null,
      heating: faker.helpers.arrayElement([
        'Gaz naturel',
        'Électricité',
        'GPL',
        'Fioul domestique',
        'Bois - Bûches'
      ])
    };
  }).onCreate((building) => adapter.create('buildings', building));
}
