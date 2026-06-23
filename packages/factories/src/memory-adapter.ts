import type { EntityMap } from './entity-map';
import type {
  PersistenceAdapter,
  PersistenceAdapterContext,
  PersistenceAdapterContextArgs
} from './persistence-adapter';

export class MemoryAdapter implements PersistenceAdapter {
  private store = new Map<string, EntityMap[keyof EntityMap][]>();

  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: PersistenceAdapterContextArgs<PersistenceAdapterContext, K>
  ): Promise<EntityMap[K]> {
    const rows = (this.store.get(table) ?? []) as EntityMap[K][];
    this.store.set(table, [...rows, entity]);
    return entity;
  }
}
