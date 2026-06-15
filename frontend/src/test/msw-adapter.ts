import type {
  Adapter,
  ContextArgs,
  EntityMap
} from '@zerologementvacant/factories';
import { match } from 'ts-pattern';

import data from '~/mocks/handlers/data';

export class MswAdapter implements Adapter {
  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: ContextArgs<K>
  ): Promise<EntityMap[K]> {
    match(table as keyof EntityMap)
      .with('establishments', () => {
        data.establishments.push(entity as EntityMap['establishments']);
      })
      .with('users', () => {
        data.users.push(entity as EntityMap['users']);
      })
      .with('owners', () => {
        data.owners.push(entity as EntityMap['owners']);
      })
      .with('housings', () => {
        data.housings.push(entity as EntityMap['housings']);
      })
      .with('campaigns', () => {
        data.campaigns.push(entity as EntityMap['campaigns']);
      })
      .with('groups', () => {
        data.groups.push(entity as EntityMap['groups']);
      })
      .exhaustive();
    return entity;
  }
}

export const mswAdapter = new MswAdapter();
