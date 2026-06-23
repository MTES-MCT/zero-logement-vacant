import type { Factory } from 'fishery';

import { createBuildingFactory } from './building';
import { createCampaignFactory } from './campaign';
import type { EntityMap } from './entity-map';
import { createEstablishmentFactory } from './establishment';
import { createGroupFactory } from './group';
import { createHousingFactory } from './housing';
import {
  createHousingOwnerFactory,
  type HousingOwnerFactoryParams
} from './housing-owner';
import { createOwnerFactory } from './owner';
import type { PersistenceAdapter } from './persistence-adapter';
import { createUserFactory } from './user';

/**
 * Server-side factories. Each one builds a fully-formed `*Api` object (the
 * shapes registered in {@link EntityMap}) and persists it through the injected
 * {@link PersistenceAdapter}.
 */
export interface Factories {
  building: Factory<EntityMap['buildings']>;
  campaign: (
    establishment: EntityMap['establishments']
  ) => Factory<EntityMap['campaigns']>;
  establishment: Factory<EntityMap['establishments']>;
  group: (
    establishment: EntityMap['establishments']
  ) => Factory<EntityMap['groups']>;
  housing: Factory<EntityMap['housings']>;
  housingOwner: (
    params: HousingOwnerFactoryParams
  ) => Factory<EntityMap['housingOwners']>;
  owner: Factory<EntityMap['owners']>;
  user: Factory<EntityMap['users']>;
}

export function createFactories(adapter: PersistenceAdapter): Factories {
  return {
    building: createBuildingFactory(adapter),
    campaign: (establishment) => createCampaignFactory(adapter, establishment),
    establishment: createEstablishmentFactory(adapter),
    group: (establishment) => createGroupFactory(adapter, establishment),
    housing: createHousingFactory(adapter),
    housingOwner: (params) => createHousingOwnerFactory(adapter, params),
    owner: createOwnerFactory(adapter),
    user: createUserFactory(adapter)
  };
}
