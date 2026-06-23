import { Factory } from 'fishery';

import { HousingApi } from '~/models/HousingApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createHousingFactory(adapter: PersistenceAdapter) {
  return Factory.define<HousingApi>(
    ({ associations, params, transientParams }) => {
      const dto = dtoFactories.housing.build(params, {
        associations,
        transient: transientParams
      });
      return {
        ...dto,
        owner: null,
        buildingGroupId: null,
        geolocation: null,
        occupancyRegistered: dto.occupancy
      };
    }
  ).onCreate((housing) => adapter.create('housings', housing));
}
