import type { Adapter, ContextOf } from './adapter';
import type { EntityMap } from './entity-map';

export class MemoryAdapter implements Adapter {
  private store = new Map<string, EntityMap[keyof EntityMap][]>();

  async create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ContextOf<K>
  ): Promise<EntityMap[K]> {
    const rows = (this.store.get(table) ?? []) as EntityMap[K][];
    this.store.set(table, [...rows, entity]);
    return entity;
  }
}
