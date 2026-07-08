import type { Page } from '@playwright/test';

import { loadConfig } from '../config';
import { expect, test } from '../fixtures/auth';

const adminEstablishment = {
  id: 'e2e-admin-establishment',
  name: 'Collectivité E2E Admin',
  shortName: 'E2E Admin',
  siren: '123456789',
  available: true,
  geoCodes: ['75056'],
  kind: 'COM',
  source: 'manual'
};

async function mockTwoFactorRoutes(page: Page): Promise<void> {
  const config = loadConfig();
  const adminEmail = config.admin?.email ?? 'admin@example.com';

  await page.route('**/establishments**', async (route) => {
    await route.fulfill({ json: [adminEstablishment] });
  });

  await page.route('**/authenticate', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.email).toBe(adminEmail);
    expect(body.establishmentId).toBe(adminEstablishment.id);
    await route.fulfill({
      json: {
        requiresTwoFactor: true,
        email: adminEmail
      }
    });
  });

  await page.route('**/authenticate/verify-2fa', async (route) => {
    const body = route.request().postDataJSON();
    if (body.code === '123456') {
      await route.fulfill({
        json: {
          user: {
            id: 'admin-id',
            email: adminEmail,
            firstName: 'Admin',
            lastName: 'User',
            role: 1,
            suspendedAt: null,
            suspendedCause: null
          },
          establishment: adminEstablishment,
          authorizedEstablishments: [adminEstablishment],
          accessToken: 'fake-jwt-token'
        }
      });
      return;
    }

    await route.fulfill({
      status: 401,
      json: { message: 'Invalid 2FA code' }
    });
  });
}

async function submitAdminLogin(page: Page): Promise<void> {
  const config = loadConfig();
  const adminEmail = config.admin?.email ?? 'admin@example.com';
  const adminPassword = config.admin?.password ?? 'admin123';

  await page.goto('/admin');
  await page
    .getByLabel(/Adresse e-mail/i)
    .first()
    .fill(adminEmail);
  await page
    .getByLabel(/Mot de passe/i)
    .first()
    .fill(adminPassword);
  await page.getByLabel(/Collectivité/i).fill('Collectivité');
  await page.getByRole('option', { name: adminEstablishment.name }).click();
  await page.getByRole('button', { name: /Se connecter/i }).click();
}

test.describe('Two-factor authentication', () => {
  test.skip(
    loadConfig().authMode !== 'legacy',
    'Run with E2E_AUTH_MODE=legacy and a frontend without auth-v2'
  );

  test.beforeEach(async ({ page }) => {
    await mockTwoFactorRoutes(page);
  });

  test('requires 2FA for admin users', async ({ page }) => {
    const config = loadConfig();
    const adminEmail = config.admin?.email ?? 'admin@example.com';

    await submitAdminLogin(page);

    await page.waitForURL('**/verification-2fa');
    await expect(page.getByText(adminEmail)).toBeVisible();
    await expect(page.getByLabel(/Code de vérification/i)).toBeVisible();
  });

  test('verifies a valid 2FA code and stores the legacy JWT session', async ({
    page
  }) => {
    await submitAdminLogin(page);
    await page.waitForURL('**/verification-2fa');

    await page.getByLabel(/Code de vérification/i).fill('123456');
    await page.getByRole('button', { name: /Vérifier/i }).click();

    await page.waitForURL('**/parc-de-logements');
    const raw = await page.evaluate(() => localStorage.getItem('authUser'));
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).accessToken).toBe('fake-jwt-token');
  });

  test('shows an error for an invalid 2FA code', async ({ page }) => {
    await submitAdminLogin(page);
    await page.waitForURL('**/verification-2fa');

    await page.getByLabel(/Code de vérification/i).fill('999999');
    await page.getByRole('button', { name: /Vérifier/i }).click();

    await expect(page.getByTestId('alert-error')).toBeVisible();
    await expect(
      page.getByText(/Code de vérification invalide ou expiré/i)
    ).toBeVisible();
    await expect(page).toHaveURL(/\/verification-2fa/);
  });

  test('allows canceling 2FA and returning to the admin login', async ({
    page
  }) => {
    await submitAdminLogin(page);
    await page.waitForURL('**/verification-2fa');

    await page.getByRole('button', { name: /Annuler/i }).click();

    await expect(page).toHaveURL(/\/admin/);
  });

  test('validates the 2FA code format', async ({ page }) => {
    await submitAdminLogin(page);
    await page.waitForURL('**/verification-2fa');

    await page.getByLabel(/Code de vérification/i).fill('123');
    await page.getByRole('button', { name: /Vérifier/i }).click();
    await expect(
      page.getByText('Le code doit contenir 6 chiffres')
    ).toBeVisible();

    await page.getByLabel(/Code de vérification/i).fill('abc123');
    await page.getByRole('button', { name: /Vérifier/i }).click();
    await expect(
      page.getByText('Le code doit contenir uniquement des chiffres')
    ).toBeVisible();
  });
});
