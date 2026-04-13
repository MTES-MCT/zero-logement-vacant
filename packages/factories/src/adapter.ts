import type { EntityMap } from './entity-map';

export interface Adapter {
  create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K]
  ): Promise<EntityMap[K]>;
}
