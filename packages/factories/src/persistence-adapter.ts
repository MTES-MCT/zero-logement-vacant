import type { EntityMap } from './entity-map';

/**
 * Per-entity context required at creation time for entities whose persisted
 * shape needs information the entity itself does not carry (e.g. a DTO that
 * lacks its establishment id).
 */
export type PersistenceAdapterContext = {
  campaigns: { establishmentId: string };
  groups: { establishmentId: string };
};

/**
 * Extra creation-time arguments for entity `K` under context map `C`: a single
 * `context` argument when `K` is declared in `C`, otherwise none.
 */
export type PersistenceAdapterContextArgs<C, K> = K extends keyof C
  ? [context: C[K]]
  : [];

/**
 * Persists entities of an entity map `M`. Implementations choose the backend
 * (in-memory store, SQL database, MSW handler, …).
 *
 * `M` maps each logical entity to its persisted shape; `C` declares the
 * entities that require extra creation-time context (entities absent from `C`
 * take no context argument). Both default to the shared DTO entity map, so a
 * bare `PersistenceAdapter` is the DTO-level adapter; bind `M` (and optionally
 * `C`) to reuse the same contract over `*Api` types, frontend models, etc.
 */
export interface PersistenceAdapter<
  M = EntityMap,
  C = PersistenceAdapterContext
> {
  create<K extends keyof M>(
    table: K,
    entity: M[K],
    ...args: PersistenceAdapterContextArgs<C, K>
  ): Promise<M[K]>;
}
