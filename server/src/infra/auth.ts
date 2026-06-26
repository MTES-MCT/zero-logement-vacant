import { UserRole } from '@zerologementvacant/models';
import type { AuthRole, SessionDTO } from '@zerologementvacant/models';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import { hashPassword } from 'better-auth/crypto';
import { customSession } from 'better-auth/plugins';
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import UserMissingError from '~/errors/userMissingError';
import { createPasswordVerifier } from '~/infra/auth-password';
import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import { refreshAuthorizedEstablishments } from '~/services/establishmentAuthService';

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

// Extracted into a const + passed to customSession(fn, authOptions) below.
// Per better-auth's docs, this second argument is what lets the plugin infer
// `user` and `session` with our declared additionalFields — without it,
// `user.firstName`, `user.role`, `session.activeEstablishmentId` are all
// untyped.
const authOptions = {
  basePath: '/auth',
  database: {
    db: kyselyDb,
    type: 'postgres'
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 8 * 60 * 60,
    // Sign the session payload into a short-lived cookie so getSession reads
    // from it instead of hitting the DB on every focus/visibility refetch.
    // 60s is small enough that establishment/perimeter changes surface within
    // a minute on the next refetch.
    cookieCache: {
      enabled: true,
      maxAge: 60
    },
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
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      role: {
        type: 'string',
        required: true,
        defaultValue: UserRole.USUAL,
        input: false
      },
      phone: { type: 'string', required: false },
      position: { type: 'string', required: false },
      timePerWeek: { type: 'string', required: false },
      kind: { type: 'string', required: false },
      activatedAt: { type: 'date', required: false },
      lastAuthenticatedAt: { type: 'date', required: false },
      suspendedAt: { type: 'date', required: false },
      suspendedCause: { type: 'string', required: false },
      deletedAt: { type: 'date', required: false }
    }
  },
  emailAndPassword: {
    enabled: true,
    // Default behaviour returns identical error for unknown email and wrong password.
    // Verified in integration tests (Task 10).
    password: {
      // Accept legacy bcrypt hashes (backfilled from the old `users` table)
      // alongside better-auth's default scrypt hashes for new signups. On a
      // successful bcrypt verify, opportunistically rehash to scrypt so the
      // bcrypt support is bounded in time.
      verify: createPasswordVerifier({
        rehash: async ({ previousHash, password }) => {
          const newHash = await hashPassword(password);
          await kyselyDb
            .updateTable('account')
            .set({ password: newHash })
            .where('password', '=', previousHash)
            .execute();
        }
      })
    }
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
          // Mirror the legacy signInToEstablishment flow exactly:
          //   1. Load the user; refuse the session if they don't exist in
          //      the legacy `users` table — protected endpoints depend on it.
          //   2. Refresh users_establishments from Portail DF so the
          //      switch-establishment dropdown sees fresh data when it
          //      renders.
          //   3. Use `user.establishmentId` (the user's primary establishment)
          //      as the active establishment for the session — same source of
          //      truth as the legacy /signin endpoint. If null, abort with
          //      UNPROCESSABLE_ENTITY (legacy parity).
          const user = await userRepository.get(session.userId);
          if (!user) {
            throw new APIError('UNPROCESSABLE_ENTITY', {
              message: 'User has no active establishment'
            });
          }

          await refreshAuthorizedEstablishments(user);

          if (!user.establishmentId) {
            throw new APIError('UNPROCESSABLE_ENTITY', {
              message: 'User has no active establishment'
            });
          }

          return {
            data: {
              ...session,
              activeEstablishmentId: user.establishmentId
            }
          };
        },
        after: async (session) => {
          // Refresh user kind after session creation. Errors are swallowed —
          // login must not fail because Portail DF is down.
          try {
            const user = await userRepository.get(session.userId);
            if (!user) {
              throw new UserMissingError(session.userId);
            }
            await fetchUserKind(user.email);
          } catch (error) {
            logger.warn('Post-session-create hook failed (non-fatal)', {
              error
            });
          }
        }
      }
    }
  },
  // Browser POSTs (sign-in/out) are CSRF-checked by better-auth against this
  // list, which must therefore include the real frontend origin(s). Reuse the
  // same allowlist that drives Express CORS so the two never drift apart.
  trustedOrigins: config.app.allowedOrigins,
  advanced: {
    cookiePrefix: 'zlv'
  }
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    // Augment getSession (and useSession() on the client) with the ZLV
    // business data the frontend needs in one reactive call:
    //   - establishment: full Establishment for session.activeEstablishmentId
    //   - authorizedEstablishments: switcher options (filtered by commitment)
    //   - effectiveGeoCodes: server-computed perimeter intersection
    // The session.cookieCache configured in authOptions amortizes the cost.
    //
    // Passing authOptions as the second arg lets better-auth infer `user` /
    // `session` with our declared additionalFields — `user.firstName`,
    // `user.role`, `session.activeEstablishmentId` are all properly typed
    // inside the callback (no casts needed).
    customSession(async ({ user, session }): Promise<SessionDTO> => {
      const activeEstablishmentId = session.activeEstablishmentId ?? null;
      // ADMIN and VISITOR bypass perimeter filtering (effectiveGeoCodes stays
      // undefined → no restriction). Skip the perimeter fetch for them.
      const role = (user.role ?? 'usual') as AuthRole;
      const needsPerimeterFilter = role !== 'admin' && role !== 'visitor';

      // Batch 1: three independent reads in parallel.
      const [establishment, authorisedLinks, userPerimeter] = await Promise.all(
        [
          activeEstablishmentId
            ? establishmentRepository.get(activeEstablishmentId)
            : Promise.resolve(null),
          userEstablishmentRepository.getAuthorizedEstablishments(user.id),
          needsPerimeterFilter
            ? userPerimeterRepository.get(user.id)
            : Promise.resolve(null)
        ]
      );

      // Batch 2: dependent on batch 1, but independent of each other.
      const authorisedIds = authorisedLinks
        .filter((link) => link.hasCommitment)
        .map((link) => link.establishmentId);
      const [authorizedEstablishments, effectiveGeoCodes] = await Promise.all([
        authorisedIds.length > 0
          ? establishmentRepository.find({ filters: { id: authorisedIds } })
          : Promise.resolve([]),
        establishment && needsPerimeterFilter
          ? filterGeoCodesByPerimeter(
              establishment.geoCodes,
              userPerimeter,
              establishment.siren
            )
          : Promise.resolve(undefined)
      ]);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          role,
          suspendedAt:
            user.suspendedAt instanceof Date
              ? user.suspendedAt.toISOString()
              : (user.suspendedAt ?? null),
          suspendedCause: user.suspendedCause ?? null
        },
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt:
            session.expiresAt instanceof Date
              ? session.expiresAt.toISOString()
              : session.expiresAt,
          activeEstablishmentId
        },
        establishment,
        authorizedEstablishments,
        effectiveGeoCodes
      };
    }, authOptions)
  ]
});
