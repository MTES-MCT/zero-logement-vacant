import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { UserRole } from '@zerologementvacant/models';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { USERS_TABLE, type UserDBO } from '~/repositories/userRepository';

const logger = createLogger('backfill-auth-users');

const AUTH_USERS_TABLE = 'auth_users';
const ACCOUNT_TABLE = 'account';
const CREDENTIAL_PROVIDER_ID = 'credential';

type DatabaseDate = Date | string;

const ROLE_TO_STRING: Record<number, string> = {
  [UserRole.USUAL]: 'usual',
  [UserRole.ADMIN]: 'admin',
  [UserRole.VISITOR]: 'visitor'
};

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function assertNoCaseInsensitiveEmailCollisions(
  users: ReadonlyArray<UserDBO>
): void {
  const userIdsByEmail = new Map<string, Set<string>>();

  for (const user of users) {
    const email = normalizeEmail(user.email);
    const userIds = userIdsByEmail.get(email) ?? new Set<string>();
    userIds.add(user.id);
    userIdsByEmail.set(email, userIds);
  }

  const collisions = [...userIdsByEmail.entries()]
    .filter(([, userIds]) => userIds.size > 1)
    .map(([email, userIds]) => `${email} (${[...userIds].join(', ')})`);

  if (collisions.length > 0) {
    throw new Error(
      `Case-insensitive email collisions detected: ${collisions.join('; ')}`
    );
  }
}

interface AuthUserRow {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  role: string;
  phone: string | null;
  position: string | null;
  time_per_week: string | null;
  kind: string | null;
  activated_at: DatabaseDate | null;
  last_authenticated_at: DatabaseDate | null;
  suspended_at: DatabaseDate | null;
  suspended_cause: string | null;
  deleted_at: DatabaseDate | null;
  created_at: DatabaseDate;
  updated_at: DatabaseDate;
}

function toAuthUserRow(user: UserDBO): AuthUserRow {
  const fullName = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();

  return {
    id: user.id,
    name: fullName.length > 0 ? fullName : user.email,
    email: normalizeEmail(user.email),
    email_verified: true,
    first_name: user.first_name,
    last_name: user.last_name,
    role: ROLE_TO_STRING[user.role] ?? 'usual',
    phone: user.phone,
    position: user.position,
    time_per_week: user.time_per_week,
    kind: user.kind,
    activated_at: user.activated_at,
    last_authenticated_at: user.last_authenticated_at,
    suspended_at: user.suspended_at,
    suspended_cause: user.suspended_cause,
    deleted_at: user.deleted_at,
    created_at: user.activated_at ?? user.updated_at,
    updated_at: user.updated_at
  };
}

function canCreateCredentialAccount(user: UserDBO): boolean {
  return user.deleted_at === null && Boolean(user.password);
}

interface Counts {
  inserted: number;
  skippedExisting: number;
  accountInserted: number;
  accountSkippedExisting: number;
  accountSkippedUnavailable: number;
  errored: number;
}

export interface RunOptions {
  dryRun: boolean;
}

class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback');
  }
}

async function backfillOne(
  user: UserDBO,
  counts: Counts,
  opts: RunOptions
): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      const inserted = await trx(AUTH_USERS_TABLE)
        .insert(toAuthUserRow(user))
        .onConflict('id')
        .ignore()
        .returning('id');

      if (inserted.length === 0) {
        counts.skippedExisting += 1;
      } else {
        counts.inserted += 1;
      }

      if (!canCreateCredentialAccount(user)) {
        counts.accountSkippedUnavailable += 1;
      } else {
        const existingAccount = await trx(ACCOUNT_TABLE)
          .where({
            user_id: user.id,
            provider_id: CREDENTIAL_PROVIDER_ID
          })
          .first();
        if (existingAccount) {
          counts.accountSkippedExisting += 1;
        } else {
          await trx(ACCOUNT_TABLE).insert({
            id: randomUUID(),
            account_id: normalizeEmail(user.email),
            provider_id: CREDENTIAL_PROVIDER_ID,
            user_id: user.id,
            password: user.password
          });
          counts.accountInserted += 1;
        }
      }

      if (opts.dryRun) {
        throw new DryRunRollback();
      }
    });
  } catch (error) {
    if (error instanceof DryRunRollback) {
      return;
    }
    counts.errored += 1;
    logger.error('Failed to backfill user', { userId: user.id, error });
  }
}

export async function run(opts: RunOptions): Promise<void> {
  logger.info('Starting backfill', { dryRun: opts.dryRun });

  const users = await db<UserDBO>(USERS_TABLE).select('*');
  logger.info(`Loaded ${users.length} legacy users`);
  assertNoCaseInsensitiveEmailCollisions(users);

  const counts: Counts = {
    inserted: 0,
    skippedExisting: 0,
    accountInserted: 0,
    accountSkippedExisting: 0,
    accountSkippedUnavailable: 0,
    errored: 0
  };

  for (const user of users) {
    await backfillOne(user, counts, opts);
  }

  logger.info('Backfill complete', counts);

  if (counts.errored > 0) {
    throw new Error(`Backfill completed with ${counts.errored} error(s)`);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await run({ dryRun });
  } catch (error) {
    logger.error('Backfill aborted', { error });
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
