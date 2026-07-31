import { createFactories } from './create-factories';
import { kyselyAdapter } from './kysely-adapter';

/**
 * Composition root for the server factories: the ready-to-use `factories`
 * object, wired to persist through the Kysely adapter so test setup runs on the
 * same engine as the repositories under test.
 *
 * This is intentionally NOT a barrel — it does not re-export the surrounding
 * modules. Import types and builders directly from their files
 * (`./entity-map`, `./create-factories`, `./persistence-adapter`, …) to avoid
 * pulling the whole DB-bound graph in through a single import and to sidestep
 * `export *` cycles.
 */
export const factories = createFactories(kyselyAdapter);
