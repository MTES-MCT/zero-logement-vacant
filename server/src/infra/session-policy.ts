import type { BetterAuthOptions } from 'better-auth';

export const SESSION_IDLE_TIMEOUT_SECONDS = 8 * 60 * 60;
export const SESSION_ABSOLUTE_TIMEOUT_SECONDS = 30 * 24 * 60 * 60;

type DatabaseHooks = NonNullable<BetterAuthOptions['databaseHooks']>;
type SessionHooks = NonNullable<DatabaseHooks['session']>;
type SessionUpdateHook = NonNullable<
  NonNullable<SessionHooks['update']>['before']
>;

interface SessionExpirationOptions {
  createdAt: Date;
  activityAt: Date;
}

export function getSessionExpiration({
  createdAt,
  activityAt
}: SessionExpirationOptions): Date {
  const idleExpiration =
    activityAt.getTime() + SESSION_IDLE_TIMEOUT_SECONDS * 1000;
  const absoluteExpiration =
    createdAt.getTime() + SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1000;

  return new Date(Math.min(idleExpiration, absoluteExpiration));
}

export const sessionLifetimeUpdateHook: SessionUpdateHook = async (
  session,
  context
) => {
  const currentSession = context?.context.session?.session;
  if (!currentSession || !session.updatedAt) {
    return;
  }

  const activityAt = new Date(session.updatedAt);
  const expiresAt = getSessionExpiration({
    createdAt: new Date(currentSession.createdAt),
    activityAt
  });

  if (expiresAt <= activityAt) {
    return false;
  }

  return {
    data: {
      ...session,
      expiresAt
    }
  };
};
