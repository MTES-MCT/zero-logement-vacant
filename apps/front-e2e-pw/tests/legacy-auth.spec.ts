import type { Page } from '@playwright/test';

import { loadConfig } from '../config';
import { expect, test } from '../fixtures/auth';

async function legacySignIn(page: Page): Promise<void> {
  const config = loadConfig();
  await page.goto('/connexion');
  await page
    .getByLabel(/Adresse e-mail/i)
    .first()
    .fill(config.email);
  await page
    .getByLabel(/Mot de passe/i)
    .first()
    .fill(config.password);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await page.waitForURL('**/parc-de-logements');
}

test.describe('Legacy authentication', () => {
  test.skip(
    loadConfig().authMode !== 'legacy',
    'Run with E2E_AUTH_MODE=legacy and a frontend without auth-v2'
  );

  test('logs in through /authenticate and stores the legacy JWT session', async ({
    page
  }) => {
    const config = loadConfig();
    const authenticate = page.waitForResponse(
      (response) =>
        response.url() === `${config.api}/authenticate` &&
        response.request().method() === 'POST'
    );

    await legacySignIn(page);

    expect((await authenticate).status()).toBe(200);
    await expect(page).toHaveURL(/\/parc-de-logements/);

    const raw = await page.evaluate(() => localStorage.getItem('authUser'));
    expect(raw).not.toBeNull();
    const authUser = JSON.parse(raw!);
    expect(authUser.accessToken).toEqual(expect.any(String));
    expect(authUser.accessToken).not.toEqual('');
    expect(authUser.user.email).toBe(config.email);
  });

  test('sends the x-access-token header on authenticated API calls', async ({
    page
  }) => {
    const config = loadConfig();
    const authenticatedRequests: string[] = [];

    page.on('request', (request) => {
      if (!request.url().startsWith(config.api)) {
        return;
      }
      if (request.headers()['x-access-token']) {
        authenticatedRequests.push(
          `${request.method()} ${new URL(request.url()).pathname}`
        );
      }
    });

    await legacySignIn(page);
    await page.waitForLoadState('networkidle');

    expect(authenticatedRequests).toContain('GET /housing');
  });

  test('clears the legacy auth session on sign-out', async ({ page }) => {
    await legacySignIn(page);

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('authUser')))
      .not.toBeNull();

    await page
      .getByRole('navigation', { name: 'Navigation du compte utilisateur' })
      .getByRole('button')
      .click();
    await page.getByRole('button', { name: /Se déconnecter/i }).click();

    await expect(
      page.getByRole('link', { name: /Connexion/i }).first()
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('authUser')))
      .toBeNull();
  });
});
