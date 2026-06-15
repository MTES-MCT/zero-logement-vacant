import createFactories from '@zerologementvacant/factories';

import { knexAdapter } from './knex-adapter';

export const factories = createFactories(knexAdapter);
