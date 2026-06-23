import type { Adapter } from '@zerologementvacant/factories';

import type { EntityMap } from './entity-map';

/**
 * Server-side persistence adapter: the shared {@link Adapter} contract bound to
 * the `*Api` {@link EntityMap}. API entities are self-contained, so no
 * per-entity creation context is needed. Implemented by {@link KnexAdapter}.
 */
export type PersistenceAdapter = Adapter<EntityMap, Record<never, never>>;
