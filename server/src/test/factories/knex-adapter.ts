import type { ContextArgs } from '@zerologementvacant/factories';
import { match } from 'ts-pattern';

import {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';

import type { EntityMap } from './entity-map';
import type { PersistenceAdapter } from './persistence-adapter';

/**
 * Persists fully-formed `*Api` entities to the database. Conversion from the
 * shared DTOs happens in the factories, so each case here only has to format
 * the `*Api` object to its DBO and insert it. API entities are self-contained,
 * so no per-entity context is taken.
 */
export class KnexAdapter implements PersistenceAdapter {
  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: ContextArgs<Record<never, never>, K>
  ): Promise<EntityMap[K]> {
    await match(table as keyof EntityMap)
      .with('users', async () => {
        await Users().insert(toUserDBO(entity as EntityMap['users']));
      })
      .with('establishments', async () => {
        await Establishments().insert(
          formatEstablishmentApi(entity as EntityMap['establishments'])
        );
      })
      .with('owners', async () => {
        await Owners().insert(formatOwnerApi(entity as EntityMap['owners']));
      })
      .with('buildings', async () => {
        await Buildings().insert(
          formatBuildingApi(entity as EntityMap['buildings'])
        );
      })
      .with('campaigns', async () => {
        await Campaigns().insert(
          formatCampaignApi(entity as EntityMap['campaigns'])
        );
      })
      .with('housings', async () => {
        await Housing().insert(
          formatHousingRecordApi(entity as EntityMap['housings'])
        );
      })
      .with('housingOwners', async () => {
        await HousingOwners().insert(
          formatHousingOwnerApi(entity as EntityMap['housingOwners'])
        );
      })
      .exhaustive();

    return entity;
  }
}

export const knexAdapter = new KnexAdapter();
