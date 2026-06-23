import type {
  BuildingDTO,
  CampaignDTO,
  EstablishmentDTO,
  GroupDTO,
  HousingDTO,
  OwnerDTO,
  UserDTO
} from '@zerologementvacant/models';
import type { Factory } from 'fishery';

import { createBuildingFactory } from './factories/building';
import { createCampaignFactory } from './factories/campaign';
import { createEstablishmentFactory } from './factories/establishment';
import { createGroupFactory } from './factories/group';
import { createHousingFactory } from './factories/housing';
import { createOwnerFactory } from './factories/owner';
import { createUserFactory } from './factories/user';
import type { PersistenceAdapter } from './persistence-adapter';

export interface Factories {
  building: Factory<BuildingDTO>;
  campaign: (establishment: EstablishmentDTO) => Factory<CampaignDTO>;
  establishment: Factory<EstablishmentDTO>;
  group: (establishment: EstablishmentDTO) => Factory<GroupDTO>;
  housing: Factory<HousingDTO>;
  owner: Factory<OwnerDTO>;
  user: Factory<UserDTO>;
}

export default function createFactories(
  adapter: PersistenceAdapter
): Factories {
  return {
    building: createBuildingFactory(adapter),
    campaign: (establishment) => createCampaignFactory(adapter, establishment),
    establishment: createEstablishmentFactory(adapter),
    group: (establishment) => createGroupFactory(adapter, establishment),
    housing: createHousingFactory(adapter),
    owner: createOwnerFactory(adapter),
    user: createUserFactory(adapter)
  };
}
