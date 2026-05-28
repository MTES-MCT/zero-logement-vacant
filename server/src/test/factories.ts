import createDtoFactories, {
  type Adapter
} from '@zerologementvacant/factories';
import {
  type CampaignDTO,
  type EstablishmentDTO,
  type GroupDTO
} from '@zerologementvacant/models';
import { Factory } from 'fishery';

type CampaignTransient = { establishment: EstablishmentDTO };
type GroupTransient = { establishment: EstablishmentDTO };

class ServerCampaignFactory extends Factory<CampaignDTO, CampaignTransient> {
  forEstablishment(establishment: EstablishmentDTO) {
    return this.transient({ establishment });
  }
}

class ServerGroupFactory extends Factory<GroupDTO, GroupTransient> {
  forEstablishment(establishment: EstablishmentDTO) {
    return this.transient({ establishment });
  }
}

export default function createServerFactories(adapter: Adapter) {
  const base = createDtoFactories(adapter);

  const campaign = ServerCampaignFactory.define(
    ({ params, associations, transientParams }) => {
      if (!associations.createdBy) {
        throw new Error(
          'ServerCampaignFactory: createdBy association is required'
        );
      }
      if (!transientParams.establishment) {
        throw new Error(
          'ServerCampaignFactory: establishment transient param is required'
        );
      }
      return base.campaign.build(params, {
        associations: {
          createdBy: {
            ...associations.createdBy,
            establishmentId: transientParams.establishment.id
          }
        }
      });
    }
  ).onCreate((dto) => adapter.create('campaigns', dto));

  const group = ServerGroupFactory.define(
    ({ params, associations, transientParams }) => {
      if (!associations.createdBy) {
        throw new Error(
          'ServerGroupFactory: createdBy association is required'
        );
      }
      if (!transientParams.establishment) {
        throw new Error(
          'ServerGroupFactory: establishment transient param is required'
        );
      }
      return base.group.build({
        ...params,
        createdBy: {
          ...associations.createdBy,
          establishmentId: transientParams.establishment.id
        }
      });
    }
  ).onCreate((dto) => adapter.create('groups', dto));

  return {
    ...base,
    campaign,
    group
  };
}
