import { betterAuth } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getByEmailIncludingDeleted: vi.fn()
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('fake-password-hash')
  }
}));
vi.mock('~/repositories/userRepository', () => ({
  default: {
    getByEmailIncludingDeleted: mocks.getByEmailIncludingDeleted,
    update: vi.fn()
  }
}));
vi.mock('~/repositories/establishmentRepository', () => ({
  default: { get: vi.fn() }
}));
vi.mock('~/services/ceremaService/userKindService', () => ({
  fetchUserKind: vi.fn()
}));
vi.mock('~/services/mailService', () => ({
  default: { sendTwoFactorCode: vi.fn() }
}));

import { zlvAdminTwoFactor } from '../auth-admin-two-factor';

function createTestAuth() {
  return betterAuth({
    baseURL: 'http://localhost',
    basePath: '/auth',
    secret: 'test-secret-at-least-32-characters-long',
    rateLimit: { enabled: true },
    plugins: [zlvAdminTwoFactor()]
  });
}

let testAuth: ReturnType<typeof createTestAuth>;

async function post(path: string, body: Record<string, unknown>) {
  return testAuth.handler(
    new Request(`http://localhost/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}

describe('zlvAdminTwoFactor rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getByEmailIncludingDeleted.mockResolvedValue(undefined);
    testAuth = createTestAuth();
  });

  it('limits admin password attempts to 10 requests per minute', async () => {
    const responses = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      responses.push(
        await post('/admin/sign-in', {
          email: 'admin@example.com',
          password: 'WrongPassword1!'
        })
      );
    }

    expect(responses.slice(0, 10).map(({ status }) => status)).not.toContain(
      429
    );
    expect(responses[10].status).toBe(429);
  });

  it('limits admin two-factor attempts to 10 requests per minute', async () => {
    const responses = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      responses.push(
        await post('/admin/verify-2fa', {
          email: 'admin@example.com',
          code: '000000'
        })
      );
    }

    expect(responses.slice(0, 10).map(({ status }) => status)).not.toContain(
      429
    );
    expect(responses[10].status).toBe(429);
  });
});
