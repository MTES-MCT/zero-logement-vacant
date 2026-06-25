import { test as base, type Page } from '@playwright/test';

import config from '../config';

/**
 * Drives the login form. Extracted so individual specs don't re-implement
 * field selection and the post-login redirect wait.
 */
export async function signIn(
  page: Page,
  credentials: { email: string; password: string } = {
    email: config.email,
    password: config.password
  }
): Promise<void> {
  await page.goto('/connexion');
  await page
    .getByLabel(/Adresse e-mail/i)
    .first()
    .fill(credentials.email);
  await page
    .getByLabel(/Mot de passe/i)
    .first()
    .fill(credentials.password);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  // Auth-v2 redirects to /parc-de-logements on success.
  await page.waitForURL('**/parc-de-logements');
}

/**
 * `test.extend` fixture exposing a `signedInPage` already past the login
 * screen. Use this in any spec that doesn't care about the login flow
 * itself — it removes a copy of `signIn(page)` from every spec body.
 */
export const test = base.extend<{ signedInPage: Page }>({
  signedInPage: async ({ page }, use) => {
    await signIn(page);
    await use(page);
  }
});

export { expect } from '@playwright/test';
