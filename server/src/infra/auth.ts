import {
  UserRole,
  type AuthRole,
  type SessionDTO
} from '@zerologementvacant/models';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import { hashPassword } from 'better-auth/crypto';
import { customSession } from 'better-auth/plugins';

import UserMissingError from '~/errors/userMissingError';
import { zlvAdminTwoFactor } from '~/infra/auth-admin-two-factor';
import { getAuthCookieAttributes } from '~/infra/auth-cookie';
import { createPasswordVerifier } from '~/infra/auth-password';
import config from '~/infra/config';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import {
  sessionLifetimeUpdateHook,
  SESSION_IDLE_TIMEOUT_SECONDS
} from '~/infra/session-policy';
import { filterGeoCodesByPerimeter } from '~/models/UserPerimeterApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import { refreshAuthorizedEstablishments } from '~/services/establishmentAuthService';

// Reuses the shared `kysely` singleton (~/infra/database/kysely) instead of a
// dedicated pool. It already applies CamelCasePlugin, so better-auth's
// camelCase field names (emailVerified, createdAt, activeEstablishmentId, …)
// are transparently mapped to the snake_case columns defined by ZLV's
// migration (20260613120000_better_auth_tables.ts). better-auth's kysely
// adapter always resolves null equality to `is`/`is not` before building a
// where clause, so the shared instance's SafeNullComparisonPlugin never
// trips on it. Verified by integration test (Task 10).
const authOptions = {
  basePath: '/auth',
  secret: config.auth.secret,
  database: {
    db: kysely,
    type: 'postgres'
  },
  session: {
    // Better Auth slides expiresIn whenever updateAge elapses. Refresh on each
    // authoritative read so expiresIn is an idle window.
    expiresIn: SESSION_IDLE_TIMEOUT_SECONDS,
    // Do not enable cookieCache: password resets and administrative revocation
    // must invalidate a server-side session immediately, not after a cached
    // session payload expires in the browser.
    updateAge: 0,
    additionalFields: {
      activeEstablishmentId: {
        type: 'string',
        required: false,
        defaultValue: null
      }
    }
  },
  user: {
    modelName: 'auth_users'
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
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
          await kysely
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
          // Refresh authorization context before creating the session:
          //   1. Load the user; refuse the session if they don't exist in the
          //      ZLV `users` table used by protected business endpoints.
          //   2. Refresh users_establishments from Portail DF so the
          //      switch-establishment dropdown sees fresh data when it
          //      renders.
          //   3. Use `user.establishmentId` (the user's primary establishment)
          //      as the active establishment for the session. If null, abort
          //      with UNPROCESSABLE_ENTITY.
          const user = await userRepository.get(session.userId);
          if (!user) {
            throw new APIError('UNPROCESSABLE_ENTITY', {
              message: 'User has no active establishment'
            });
          }

          const sessionEstablishmentId =
            typeof session.activeEstablishmentId === 'string'
              ? session.activeEstablishmentId
              : null;
          const activeEstablishmentId =
            sessionEstablishmentId ?? user.establishmentId;

          if (!activeEstablishmentId) {
            throw new APIError('UNPROCESSABLE_ENTITY', {
              message: 'User has no active establishment'
            });
          }

          await refreshAuthorizedEstablishments(user, {
            establishmentId: activeEstablishmentId
          });

          return {
            data: {
              ...session,
              activeEstablishmentId
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
            const kind = await fetchUserKind(user.email);
            await userRepository.update({
              ...user,
              kind,
              lastAuthenticatedAt: new Date().toJSON(),
              updatedAt: new Date().toJSON()
            });
          } catch (error) {
            logger.warn('Post-session-create hook failed (non-fatal)', {
              error
            });
          }
        }
      },
      update: {
        // Keep sliding idle expiry bounded by the original creation time.
        before: sessionLifetimeUpdateHook
      }
    }
  },
  // Browser POSTs (sign-in/out) are CSRF-checked by better-auth against this
  // list, which must therefore include the real frontend origin(s). Reuse the
  // same allowlist that drives Express CORS so the two never drift apart.
  trustedOrigins: config.app.allowedOrigins,
  // Establishment changes must go through the checked account controller.
  // disabledPaths applies to the HTTP router only, so the controller can still
  // call auth.api.updateSession after validating the user's authorization.
  disabledPaths: ['/update-session'],
  advanced: {
    cookiePrefix: 'zlv',
    defaultCookieAttributes: getAuthCookieAttributes(config.app.isReviewApp)
  }
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    zlvAdminTwoFactor(),
    // Augment getSession (and useSession() on the client) with the ZLV
    // business data the frontend needs in one reactive call:
    //   - establishment: full Establishment for session.activeEstablishmentId
    //   - authorizedEstablishments: switcher options (filtered by commitment)
    //   - effectiveGeoCodes: server-computed perimeter intersection
    customSession(async ({ user, session }): Promise<SessionDTO> => {
      const activeEstablishmentId = session.activeEstablishmentId ?? null;
      const domainUser = await userRepository.get(user.id);
      if (!domainUser) {
        throw new UserMissingError(user.id);
      }

      // ADMIN and VISITOR bypass perimeter filtering (effectiveGeoCodes stays
      // undefined → no restriction). Skip the perimeter fetch for them.
      let role: AuthRole = 'usual';
      if (domainUser.role === UserRole.ADMIN) {
        role = 'admin';
      } else if (domainUser.role === UserRole.VISITOR) {
        role = 'visitor';
      }
      const needsPerimeterFilter = role !== 'admin' && role !== 'visitor';

      // Batch 1: three independent reads in parallel.
      const [establishment, authorisedLinks, userPerimeter] = await Promise.all(
        [
          activeEstablishmentId
            ? establishmentRepository.get(activeEstablishmentId)
            : Promise.resolve(null),
          userEstablishmentRepository.getAuthorizedEstablishments(
            domainUser.id
          ),
          needsPerimeterFilter && activeEstablishmentId
            ? userPerimeterRepository.get(domainUser.id, activeEstablishmentId)
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
          name:
            [domainUser.firstName, domainUser.lastName]
              .filter((part): part is string => Boolean(part))
              .join(' ')
              .trim() || user.name,
          image: user.image ?? null,
          firstName: domainUser.firstName,
          lastName: domainUser.lastName,
          role,
          suspendedAt: domainUser.suspendedAt,
          suspendedCause: domainUser.suspendedCause
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
