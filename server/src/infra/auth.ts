import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { UserRole } from '@zerologementvacant/models';
import config from '~/infra/config';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userRepository from '~/repositories/userRepository';
import { refreshAuthorizedEstablishments } from '~/services/establishmentAuthService';
import { fetchUserKind } from '~/services/ceremaService/userKindService';
import { logger } from '~/infra/logger';

const pool = new Pool({ connectionString: config.db.url });

export const auth = betterAuth({
  database: pool,
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
          const authorised = await userEstablishmentRepository
            .getAuthorizedEstablishments(session.userId);
          const first = authorised.find((e) => e.hasCommitment);
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
