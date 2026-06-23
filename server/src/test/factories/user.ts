import { faker } from '@faker-js/faker/locale/fr';
import { Factory } from 'fishery';

import { UserApi } from '~/models/UserApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createUserFactory(adapter: PersistenceAdapter) {
  return Factory.define<UserApi>(({ params }) => {
    const user = dtoFactories.user.build(params);
    return {
      ...user,
      password: faker.internet.password(),
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorCode: null,
      twoFactorCodeGeneratedAt: null,
      twoFactorFailedAttempts: 0,
      twoFactorLockedUntil: null,
      deletedAt: null
    };
  }).onCreate((user) => adapter.create('users', user));
}
