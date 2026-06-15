import { betterAuth } from 'better-auth';
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { UserRole } from '@zerologementvacant/models';
import config from '~/infra/config';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userRepository from '~/repositories/userRepository';
import { refreshAuthorizedEstablishments } from '~/services/establishmentAuthService';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import { logger } from '~/infra/logger';

const pool = new Pool({ connectionString: config.db.url });

// Wrap the pool in a Kysely instance with CamelCasePlugin so that better-auth's
// camelCase field names (emailVerified, createdAt, activeEstablishmentId, …)
// are transparently mapped to the snake_case columns defined by ZLV's
// migration (20260613120000_better_auth_tables.ts). Without this plugin,
// queries fail with "column emailVerified does not exist". Verified by
// integration test (Task 10).
const kyselyDb = new Kysely<any>({
  dialect: new PostgresDialect({ pool }),
  plugins: [new CamelCasePlugin()]
});

export const auth = betterAuth({
  database: {
    db: kyselyDb,
    type: 'postgres'
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 8 * 60 * 60,
    additionalFields: {
      activeEstablishmentId: {
        type: 'string',
        required: false,
        defaultValue: null
      }
    }
  },
  user: {
    modelName: 'auth_users',
    additionalFields: {
      firstName:           { type: 'string', required: false },
      lastName:            { type: 'string', required: false },
      role:                { type: 'string', required: true, defaultValue: UserRole.USUAL, input: false },
      phone:               { type: 'string', required: false },
      position:            { type: 'string', required: false },
      timePerWeek:         { type: 'string', required: false },
      kind:                { type: 'string', required: false },
      activatedAt:         { type: 'date',   required: false },
      lastAuthenticatedAt: { type: 'date',   required: false },
      suspendedAt:         { type: 'date',   required: false },
      suspendedCause:      { type: 'string', required: false },
      deletedAt:           { type: 'date',   required: false }
    }
  },
  emailAndPassword: {
    enabled: true
    // Default behaviour returns identical error for unknown email and wrong password.
    // Verified in integration tests (Task 10).
  },
  // emailVerification intentionally omitted. The existing mailService.sendAccountActivationEmail(key, options)
  // signature is incompatible with better-auth's ({ user, url, token }) callback — it builds the activation
  // URL internally from a key, pointing at the legacy /activation route, not the better-auth verification
  // route. Once the new signup flow is built (out of scope here), add a new mailService method that takes a
  // full URL and wire emailVerification here.
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Resilient lookup. better-auth `auth_users.id` is a nanoid string,
          // but the legacy `users_establishments.user_id` is a UUID with a FK
          // to the legacy `users` table. For users that exist in `auth_users`
          // but not in the legacy `users` table (e.g. brand-new signups, or
          // tests), the query will raise `invalid input syntax for type uuid`
          // — which we treat as "no authorised establishments" and fall back
          // to `activeEstablishmentId: null`. Once the legacy `users` table
          // is fully migrated to `auth_users`, this try/catch becomes dead
          // code and can be removed.
          let first: { establishmentId: string } | undefined;
          try {
            const authorised = await userEstablishmentRepository
              .getAuthorizedEstablishments(session.userId);
            first = authorised.find((e) => e.hasCommitment);
          } catch (error) {
            logger.warn(
              'Could not resolve authorized establishments for session.userId; defaulting to null',
              { userId: session.userId, error }
            );
          }
          return {
            data: {
              ...session,
              activeEstablishmentId: first?.establishmentId ?? null
            }
          };
        },
        after: async (session) => {
          // Refresh Portail DF rights and user kind after session creation.
          // Errors are swallowed — login must not fail because Portail DF is down.
          try {
            const user = await userRepository.get(session.userId);
            if (!user) {
              logger.warn('Session created for unknown user', { userId: session.userId });
              return;
            }
            await refreshAuthorizedEstablishments(user);
            await fetchUserKind(user.email);
          } catch (error) {
            logger.warn('Post-session-create hook failed (non-fatal)', { error });
          }
        }
      }
    }
  },
  trustedOrigins: [config.app.frontendUrl],
  advanced: {
    cookiePrefix: 'zlv'
  }
});
