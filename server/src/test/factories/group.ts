import { Factory } from 'fishery';

import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GroupApi } from '~/models/GroupApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createGroupFactory(
  adapter: PersistenceAdapter,
  establishment: EstablishmentApi
) {
  return Factory.define<GroupApi>(({ associations }) => {
    if (!associations.createdBy) {
      throw new Error(
        'Group factory: createdBy association is required. ' +
          'Pass it via: factories.group(establishment).build({}, { associations: { createdBy: user } })'
      );
    }
    const createdBy = associations.createdBy;
    const dto = dtoFactories
      .group(establishment)
      .build({}, { associations: { createdBy } });
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      housingCount: dto.housingCount,
      ownerCount: dto.ownerCount,
      createdBy,
      userId: createdBy.id,
      establishmentId: establishment.id,
      createdAt: new Date(dto.createdAt),
      exportedAt: null,
      archivedAt: dto.archivedAt ? new Date(dto.archivedAt) : null
    };
  }).onCreate((group) => adapter.create('groups', group));
}
