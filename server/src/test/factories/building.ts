import { Factory } from 'fishery';

import { BuildingApi, fromBuildingDTO } from '~/models/BuildingApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createBuildingFactory(adapter: PersistenceAdapter) {
  return Factory.define<BuildingApi>(() =>
    fromBuildingDTO(dtoFactories.building.build())
  ).onCreate((building) => adapter.create('buildings', building));
}
