import createFactories, { type Adapter } from '@zerologementvacant/factories';

/**
 * Adapter used purely to instantiate the shared DTO factories for data
 * generation. The server factories only ever call `.build()` (never
 * `.create()`) on these, so persistence must never happen here — any attempt
 * throws. Real persistence is delegated to the injected {@link PersistenceAdapter}.
 */
const buildOnlyAdapter: Adapter = {
  create() {
    return Promise.reject(
      new Error(
        'dtoFactories are build-only: use the server factories to persist.'
      )
    );
  }
};

/**
 * Shared instance of the shared DTO factories, used by the server factories
 * purely for data generation (`.build()`).
 */
export const dtoFactories = createFactories(buildOnlyAdapter);
