import type {
  Adapter,
  ContextArgs,
  EntityMap
} from '@zerologementvacant/factories';
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
    entity: EntityMap[K],
    ...args: ContextArgs<K>
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
        const [{ establishmentId }] = args as ContextArgs<'campaigns'>;
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
        const [{ establishmentId }] = args as ContextArgs<'groups'>;
        if (!group.createdBy) {
          throw new Error(
            'KnexAdapter: group.createdBy is required. ' +
              'Pass it via `associations: { createdBy: user }` when building the group.'
          );
        }
        const createdBy = fromUserDTO(group.createdBy);
        await Groups().insert(
          formatGroupApi({
            ...group,
            createdBy,
            userId: group.createdBy.id,
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
