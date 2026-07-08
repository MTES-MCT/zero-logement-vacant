import { loadConfig } from '../config';
import { expect, signIn, test } from '../fixtures/auth';

test.describe('Auth transition hardening (auth-v2)', () => {
  test.skip(
    loadConfig().authMode !== 'auth-v2',
    'Run with E2E_AUTH_MODE=auth-v2 and a frontend with auth-v2'
  );

  test('does not send a stale legacy JWT while using the cookie-backed session', async ({
    page
  }) => {
    const config = loadConfig();
    const requestsWithLegacyHeader: string[] = [];

    await page.addInitScript(() => {
      localStorage.setItem(
        'authUser',
        JSON.stringify({ accessToken: 'stale-legacy-jwt' })
      );
    });

    page.on('request', (request) => {
      if (!request.url().startsWith(config.api)) {
        return;
      }
      const legacyToken = request.headers()['x-access-token'];
      if (legacyToken) {
        requestsWithLegacyHeader.push(
          `${request.method()} ${new URL(request.url()).pathname}`
        );
      }
    });

    await signIn(page);
    await page.goto('/parc-de-logements');
    await page.waitForLoadState('networkidle');

    expect(requestsWithLegacyHeader).toEqual([]);
  });

  test('rejects admins on the better-auth password endpoint', async ({
    request
  }) => {
    const config = loadConfig();
    test.skip(
      config.admin === undefined,
      'Set CYPRESS_ADMIN_EMAIL/CYPRESS_ADMIN_PASSWORD to exercise admin auth-v2 rejection'
    );

    const response = await request.post(`${config.api}/auth/sign-in/email`, {
      data: config.admin
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const setCookie = response.headers()['set-cookie'] ?? '';
    expect(setCookie).not.toContain('zlv.session_token');
  });
});
