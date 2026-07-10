import { loadConfig } from '../config';
import { expect, signIn, test } from '../fixtures/auth';

test.describe('Suspended user', () => {
  test('shows the SuspendedUserModal on login', async ({ page }) => {
    const config = loadConfig();
    test.skip(
      config.suspended === undefined,
      'Set CYPRESS_SUSPENDED_EMAIL/CYPRESS_SUSPENDED_PASSWORD to exercise suspended-user login'
    );

    await signIn(page, config.suspended);

    await expect(
      page.getByText(
        /Vos droits d'accès à Zéro Logement Vacant ne sont plus valides/i
      )
    ).toBeVisible();
  });
});
