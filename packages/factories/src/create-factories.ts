import type { Adapter } from './adapter';
import { createCampaignFactory } from './factories/campaign';
import { createEstablishmentFactory } from './factories/establishment';
import { createGroupFactory } from './factories/group';
import { createHousingFactory } from './factories/housing';
import { createOwnerFactory } from './factories/owner';
import { createUserFactory } from './factories/user';

export type Factories = {
  campaign: ReturnType<typeof createCampaignFactory>;
  establishment: ReturnType<typeof createEstablishmentFactory>;
  group: ReturnType<typeof createGroupFactory>;
  housing: ReturnType<typeof createHousingFactory>;
  owner: ReturnType<typeof createOwnerFactory>;
  user: ReturnType<typeof createUserFactory>;
};

export default function createFactories(adapter: Adapter): Factories {
  return {
    campaign: createCampaignFactory(adapter),
    establishment: createEstablishmentFactory(adapter),
    group: createGroupFactory(adapter),
    housing: createHousingFactory(adapter),
    owner: createOwnerFactory(adapter),
    user: createUserFactory(adapter)
  };
}
