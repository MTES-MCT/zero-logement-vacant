// End-to-end integration tests for the new better-auth sign-in flow (Task 10).
//
// IMPORTANT: Unlike `auth-controller.test.ts`, this file does NOT mock
// `~/infra/auth`. The real better-auth handler must process the request so we
// can verify cookie shape and absence of email enumeration.
import { vi } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
    }))
  }
}));

vi.mock('../../services/mailService', () => ({
  default: {
    sendTwoFactorCode: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmail: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmailFromLovac: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn()
  }
}));

vi.mock('../../services/ceremaService/mockCeremaService');

vi.mock('~/services/posthogService', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false),
  default: { isFeatureEnabled: vi.fn() }
}));

import request from 'supertest';

import db from '~/infra/database';
import { createServer } from '~/infra/server';

describe('better-auth sign-in (integration)', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  beforeEach(async () => {
    // Clean better-auth tables in dependency order (children first).
    await db('session').del();
    await db('account').del();
    await db('auth_users').del();
  });

  it('sets an HttpOnly cookie on successful sign-in', async () => {
    const email = 'sign-in@zlv.fr';
    const password = 'not-a-real-password';

    // Use better-auth's own sign-up endpoint to seed `auth_users` + `account`
    // with a correctly-hashed password (scrypt via @better-auth/utils).
    const signUpResponse = await request(url)
      .post('/api/auth/sign-up/email')
      .send({ email, password, name: 'Test User' });
    expect(signUpResponse.status).toBe(200);

    const signInResponse = await request(url)
      .post('/api/auth/sign-in/email')
      .send({ email, password });

    expect(signInResponse.status).toBe(200);

    const rawCookies = signInResponse.headers['set-cookie'];
    const cookies = (
      Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : []
    ) as string[];
    expect(cookies.length).toBeGreaterThan(0);

    const sessionCookie = cookies.find((c) => c.includes('zlv.session_token'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
    // better-auth defaults to SameSite=Lax (not Strict).
    expect(sessionCookie!.toLowerCase()).toContain('samesite=lax');
  });

  it('returns identical error for unknown email and wrong password (no enumeration)', async () => {
    const email = 'real@zlv.fr';
    const password = 'not-a-real-password';

    const signUpResponse = await request(url)
      .post('/api/auth/sign-up/email')
      .send({ email, password, name: 'Real User' });
    expect(signUpResponse.status).toBe(200);

    const [unknownEmailResponse, wrongPasswordResponse] = await Promise.all([
      request(url)
        .post('/api/auth/sign-in/email')
        .send({ email: 'nobody@zlv.fr', password: 'AnyP@ssword1' }),
      request(url)
        .post('/api/auth/sign-in/email')
        .send({ email, password: 'WrongPassword1!' })
    ]);

    expect(unknownEmailResponse.status).toBeGreaterThanOrEqual(400);
    expect(wrongPasswordResponse.status).toBeGreaterThanOrEqual(400);
    expect(unknownEmailResponse.status).toBe(wrongPasswordResponse.status);
    expect(unknownEmailResponse.body).toEqual(wrongPasswordResponse.body);
  });
});
