import { Factory } from 'fishery';

import { CampaignApi } from '~/models/CampaignApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';

import { dtoFactories } from './dto-factories';
import type { PersistenceAdapter } from './persistence-adapter';

export function createCampaignFactory(
  adapter: PersistenceAdapter,
  establishment: EstablishmentApi
) {
  return Factory.define<CampaignApi>(({ associations, params }) => {
    if (!associations.createdBy) {
      throw new Error(
        'Campaign factory: createdBy association is required. ' +
          'Pass it via: factories.campaign(establishment).build({}, { associations: { createdBy: user } })'
      );
    }
    const createdBy = associations.createdBy;
    const dto = dtoFactories
      .campaign(establishment)
      .build(params, { associations: { createdBy } });
    return {
      ...dto,
      createdBy,
      userId: createdBy.id,
      establishmentId: establishment.id
    };
  }).onCreate((campaign) => adapter.create('campaigns', campaign));
}
