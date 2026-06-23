import { Factory } from 'fishery';

import { EstablishmentApi } from '~/models/EstablishmentApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createEstablishmentFactory(adapter: PersistenceAdapter) {
  return Factory.define<EstablishmentApi>(() =>
    dtoFactories.establishment.build()
  ).onCreate((establishment) =>
    adapter.create('establishments', establishment)
  );
}
