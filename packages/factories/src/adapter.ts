import type { EntityMap } from './entity-map';

export type AdapterContext = {
  campaigns: { establishmentId: string };
  groups: { establishmentId: string };
};

export type ContextArgs<K extends keyof EntityMap> =
  K extends keyof AdapterContext ? [context: AdapterContext[K]] : [];

export interface Adapter {
  create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    ...args: ContextArgs<K>
  ): Promise<EntityMap[K]>;
}
