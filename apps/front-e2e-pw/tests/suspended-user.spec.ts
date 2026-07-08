import { loadConfig } from '../config';
import { expect, signIn, test } from '../fixtures/auth';

test.describe('Suspended user', () => {
  test.skip(
    loadConfig().authMode !== 'auth-v2',
    'Run with E2E_AUTH_MODE=auth-v2 and a frontend with auth-v2'
  );

  test('shows the SuspendedUserModal on login', async ({ page }) => {
    const config = loadConfig();
    test.skip(
      config.suspended === undefined,
      'Set CYPRESS_SUSPENDED_EMAIL/CYPRESS_SUSPENDED_PASSWORD to exercise suspended auth-v2 login'
    );

    await signIn(page, config.suspended);

    await expect(
      page.getByText(
        /Vos droits d'accès à Zéro Logement Vacant ne sont plus valides/i
      )
    ).toBeVisible();
  });
});
