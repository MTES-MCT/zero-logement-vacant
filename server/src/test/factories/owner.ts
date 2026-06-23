import { Factory } from 'fishery';

import { fromOwnerDTO, OwnerApi } from '~/models/OwnerApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createOwnerFactory(adapter: PersistenceAdapter) {
  return Factory.define<OwnerApi>(({ params }) =>
    fromOwnerDTO(dtoFactories.owner.build(params))
  ).onCreate((owner) => adapter.create('owners', owner));
}
