import type { Adapter, EntityMap } from '@zerologementvacant/factories';
import { Struct } from 'effect';
import { match } from 'ts-pattern';
import { fromUserDTO } from '~/models/UserApi';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatGroupApi, Groups } from '~/repositories/groupRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';

export class KnexAdapter implements Adapter {
  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K]
  ): Promise<EntityMap[K]> {
    await match(table as keyof EntityMap)
      .with('users', async () => {
        const user = entity as EntityMap['users'];
        await Users().insert(toUserDBO(fromUserDTO(user)));
      })
      .with('establishments', async () => {
        const establishment = entity as EntityMap['establishments'];
        await Establishments().insert(formatEstablishmentApi(establishment));
      })
      .with('owners', async () => {
        const owner = entity as EntityMap['owners'];
        await Owners().insert(formatOwnerApi({ ...owner, entity: null }));
      })
      .with('housings', async () => {
        const housing = Struct.omit(entity as EntityMap['housings'], 'owner');
        await Housing().insert(
          formatHousingRecordApi({
            ...housing,
            buildingGroupId: null,
            geolocation: null,
            occupancyRegistered: housing.occupancy
          })
        );
      })
      .with('campaigns', async () => {
        const campaign = entity as EntityMap['campaigns'];
        const establishmentId = campaign.createdBy.establishmentId;
        if (!establishmentId) {
          throw new Error(
            'KnexAdapter: campaign.createdBy.establishmentId is required. ' +
              'Use ServerCampaignFactory and pass establishment as a transient param.'
          );
        }
        await Campaigns().insert(
          formatCampaignApi({
            ...campaign,
            userId: campaign.createdBy.id,
            establishmentId
          })
        );
      })
      .with('groups', async () => {
        const group = entity as EntityMap['groups'];
        const userId = group.createdBy?.id;
        const establishmentId = group.createdBy?.establishmentId;
        if (!userId || !establishmentId) {
          throw new Error(
            'KnexAdapter: group.createdBy with an establishmentId is required. ' +
              'Use ServerGroupFactory and pass establishment as a transient param.'
          );
        }
        await Groups().insert(
          formatGroupApi({
            ...group,
            createdBy: group.createdBy
              ? fromUserDTO(group.createdBy)
              : undefined,
            userId,
            establishmentId,
            createdAt: new Date(group.createdAt),
            exportedAt: null,
            archivedAt: group.archivedAt ? new Date(group.archivedAt) : null
          })
        );
      })
      .exhaustive();

    return entity;
  }
}

export const knexAdapter = new KnexAdapter();
