import { Factory } from 'fishery';

import { EstablishmentApi } from '~/models/EstablishmentApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createEstablishmentFactory(adapter: PersistenceAdapter) {
  return Factory.define<EstablishmentApi>(({ params }) =>
    dtoFactories.establishment.build(params)
  ).onCreate((establishment) =>
    adapter.create('establishments', establishment)
  );
}
