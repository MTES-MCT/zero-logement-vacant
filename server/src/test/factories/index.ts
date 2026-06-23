import { createFactories } from './create-factories';
import { knexAdapter } from './knex-adapter';

/**
 * Composition root for the server factories: the ready-to-use `factories`
 * object, wired to persist through the Knex adapter.
 *
 * This is intentionally NOT a barrel — it does not re-export the surrounding
 * modules. Import types and builders directly from their files
 * (`./entity-map`, `./create-factories`, `./persistence-adapter`, …) to avoid
 * pulling the whole DB-bound graph in through a single import and to sidestep
 * `export *` cycles.
 */
export const factories = createFactories(knexAdapter);
