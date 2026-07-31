import type { ContextArgs } from '@zerologementvacant/factories';
import { match } from 'ts-pattern';

import { kysely } from '~/infra/database/kysely';
import { toBuildingInsert } from '~/repositories/buildingRepository';
import { toCampaignInsert } from '~/repositories/campaignRepository';
import { toEstablishmentInsert } from '~/repositories/establishmentRepository';
import { toGroupDBO } from '~/repositories/groupRepository';
import { toHousingOwnerInsert } from '~/repositories/housingOwnerRepository';
import { toHousingInsert } from '~/repositories/housingRepository';
import { toOwnerInsert } from '~/repositories/ownerRepository';
import { toUserInsert } from '~/repositories/userRepository';

import type { EntityMap } from './entity-map';
import type { PersistenceAdapter } from './persistence-adapter';

/**
 * Persists fully-formed `*Api` entities through the same engine the
 * repositories use in production, so test setup and the code under test agree
 * on how values are serialized. Conversion
 * from the shared DTOs happens in the factories, so each case here only maps the
 * `*Api` object to its camel-case `Insertable` and inserts it. API entities are
 * self-contained, so no per-entity context is taken.
 */
export class KyselyAdapter implements PersistenceAdapter {
  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: ContextArgs<Record<never, never>, K>
  ): Promise<EntityMap[K]> {
    await match(table as keyof EntityMap)
      .with('users', async () => {
        await kysely
          .insertInto('users')
          .values(toUserInsert(entity as EntityMap['users']))
          .execute();
      })
      .with('establishments', async () => {
        await kysely
          .insertInto('establishments')
          .values(toEstablishmentInsert(entity as EntityMap['establishments']))
          .execute();
      })
      .with('owners', async () => {
        await kysely
          .insertInto('owners')
          .values(toOwnerInsert(entity as EntityMap['owners']))
          .execute();
      })
      .with('buildings', async () => {
        await kysely
          .insertInto('buildings')
          .values(toBuildingInsert(entity as EntityMap['buildings']))
          .execute();
      })
      .with('campaigns', async () => {
        await kysely
          .insertInto('campaigns')
          .values(toCampaignInsert(entity as EntityMap['campaigns']))
          .execute();
      })
      .with('groups', async () => {
        await kysely
          .insertInto('groups')
          .values(toGroupDBO(entity as EntityMap['groups']))
          .execute();
      })
      .with('housings', async () => {
        await kysely
          .insertInto('fastHousing')
          .values(toHousingInsert(entity as EntityMap['housings']))
          .execute();
      })
      .with('housingOwners', async () => {
        await kysely
          .insertInto('ownersHousing')
          .values(toHousingOwnerInsert(entity as EntityMap['housingOwners']))
          .execute();
      })
      .exhaustive();

    return entity;
  }
}

export const kyselyAdapter = new KyselyAdapter();
