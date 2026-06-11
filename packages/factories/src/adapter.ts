import type { EntityMap } from './entity-map';

export type AdapterContext = {
  campaigns: { establishmentId: string };
  groups: { establishmentId: string };
};

export type ContextOf<K extends keyof EntityMap> =
  K extends keyof AdapterContext ? AdapterContext[K] : void;

export interface Adapter {
  create<K extends keyof EntityMap>(
    table: K,
    entity: EntityMap[K],
    context: ContextOf<K>
  ): Promise<EntityMap[K]>;
}
