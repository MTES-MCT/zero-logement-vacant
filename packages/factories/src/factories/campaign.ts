import { faker } from '@faker-js/faker/locale/fr';
import { type CampaignDTO } from '@zerologementvacant/models';
import { Factory } from 'fishery';

import type { Adapter } from '../adapter';

export function createCampaignFactory(adapter: Adapter) {
  return Factory.define<CampaignDTO>(({ associations }) => {
    if (!associations.createdBy) {
      throw new Error(
        'Campaign factory: createdBy association is required. ' +
          'Pass it via: factory.build({}, { associations: { createdBy: user } })'
      );
    }
    return {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      status: 'draft',
      filters: {},
      createdAt: faker.date.past().toJSON(),
      createdBy: associations.createdBy,
      sentAt: null,
      housingCount: 0,
      ownerCount: 0,
      returnCount: 0,
      returnRate: null
    };
  }).onCreate((entity) => adapter.create('campaigns', entity));
}
