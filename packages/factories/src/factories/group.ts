import { faker } from '@faker-js/faker/locale/fr';
import { type GroupDTO } from '@zerologementvacant/models';
import { type EstablishmentDTO } from '@zerologementvacant/models';
import { Factory } from 'fishery';

import type { PersistenceAdapter } from '../persistence-adapter';

export function createGroupFactory(
  adapter: PersistenceAdapter,
  establishment: EstablishmentDTO
) {
  return Factory.define<GroupDTO>(({ associations }) => {
    if (!associations.createdBy) {
      throw new Error(
        'Group factory: createdBy association is required. ' +
          'Pass it via: factory.build({}, { associations: { createdBy: user } })'
      );
    }
    return {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      description: faker.lorem.sentence(),
      housingCount: 0,
      ownerCount: 0,
      createdAt: new Date().toJSON(),
      createdBy: associations.createdBy,
      archivedAt: null
    };
  }).onCreate((entity) =>
    adapter.create('groups', entity, { establishmentId: establishment.id })
  );
}
