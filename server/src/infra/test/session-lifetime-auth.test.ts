import { betterAuth } from 'better-auth';
import { customSession, testUtils } from 'better-auth/plugins';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  sessionLifetimeUpdateHook,
  SESSION_IDLE_TIMEOUT_SECONDS
} from '~/infra/session-policy';

function createTestAuth() {
  return betterAuth({
    baseURL: 'http://localhost:3001',
    secret: 'test-secret-at-least-thirty-two-characters-long',
    session: {
      expiresIn: SESSION_IDLE_TIMEOUT_SECONDS,
      updateAge: 0
    },
    databaseHooks: {
      session: {
        update: {
          before: sessionLifetimeUpdateHook
        }
      }
    },
    plugins: [
      testUtils(),
      customSession(async ({ session, user }) => ({ session, user }))
    ]
  });
}

async function signIn(testAuth: ReturnType<typeof createTestAuth>) {
  const context = await testAuth.$context;
  const user = await context.test.saveUser(context.test.createUser());
  return context.test.login({ userId: user.id });
}

describe('Better Auth session lifetime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a session after eight hours without activity', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(createdAt);

    const testAuth = createTestAuth();
    const { headers } = await signIn(testAuth);

    vi.setSystemTime(
      new Date(createdAt.getTime() + SESSION_IDLE_TIMEOUT_SECONDS * 1000 + 1)
    );
    await expect(testAuth.api.getSession({ headers })).resolves.toBeNull();
  });

  it('rejects an active session when it reaches thirty days old', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(createdAt);

    const testAuth = createTestAuth();
    const { headers } = await signIn(testAuth);

    for (let elapsedHours = 6; elapsedHours < 30 * 24; elapsedHours += 6) {
      vi.setSystemTime(
        new Date(createdAt.getTime() + elapsedHours * 60 * 60 * 1000)
      );
      await expect(
        testAuth.api.getSession({ headers })
      ).resolves.not.toBeNull();
    }

    vi.setSystemTime(new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000));
    await expect(testAuth.api.getSession({ headers })).resolves.toBeNull();
  });
});
