import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import { type GroupDTO } from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

export function createGroupFactory(adapter: Adapter) {
  return Factory.define<GroupDTO>(() => ({
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    housingCount: 0,
    ownerCount: 0,
    createdAt: new Date().toJSON(),
    archivedAt: null
  })).onCreate((entity) => adapter.create('groups', entity));
}
