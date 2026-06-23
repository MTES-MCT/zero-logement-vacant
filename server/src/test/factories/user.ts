import { Factory } from 'fishery';

import { fromUserDTO, UserApi } from '~/models/UserApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createUserFactory(adapter: PersistenceAdapter) {
  return Factory.define<UserApi>(() => ({
    ...fromUserDTO(dtoFactories.user.build()),
    password: '123QWEasd'
  })).onCreate((user) => adapter.create('users', user));
}
