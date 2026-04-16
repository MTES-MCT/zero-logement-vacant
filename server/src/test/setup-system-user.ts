import { v4 as uuidv4 } from 'uuid';

import config from '~/infra/config';
import db from '~/infra/database';

// Create the system account used by import scripts. This runs in each worker
// after setup-env.ts has resolved the dynamic SYSTEM_ACCOUNT env var.
// onConflict(...).ignore() makes it safe to run in multiple concurrent workers.
await db('users')
  .insert({
    id: uuidv4(),
    email: config.app.system,
    password: '',
    first_name: null,
    last_name: null,
    establishment_id: null,
    role: 1,
    activated_at: new Date(),
    last_authenticated_at: null,
    suspended_at: null,
    suspended_cause: null,
    deleted_at: null,
    updated_at: new Date(),
    phone: null,
    position: null,
    time_per_week: null,
    kind: null,
    two_factor_secret: null,
    two_factor_enabled_at: null,
    two_factor_code: null
  })
  .onConflict('email')
  .ignore();
