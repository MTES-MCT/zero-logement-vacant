import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  TIME_PER_WEEK_VALUES,
  UserRole,
  type UserDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

export function createUserFactory(adapter: Adapter) {
  return Factory.define<UserDTO>(() => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    position: faker.person.jobTitle(),
    timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES),
    activatedAt: faker.date.recent().toJSON(),
    lastAuthenticatedAt: faker.date.recent().toJSON(),
    suspendedAt: null,
    suspendedCause: null,
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: null,
    role: UserRole.USUAL,
    kind: null
  })).onCreate((entity) => adapter.create('users', entity));
}
