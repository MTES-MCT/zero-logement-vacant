import { expect, test } from '../fixtures/auth';
import { signIn } from '../fixtures/auth';

test.describe('Protected route gating (auth-v2)', () => {
  test('redirects an anonymous user to /connexion', async ({ page }) => {
    await page.goto('/parc-de-logements');

    // RequireAuth should bounce anonymous traffic to the login screen.
    await page.waitForURL('**/connexion**');
    await expect(
      page.getByRole('heading', { name: /Connexion/i, level: 1 })
    ).toBeVisible();
  });

  test('lets a signed-in user reach the protected route', async ({
    signedInPage
  }) => {
    await signedInPage.goto('/parc-de-logements');

    // We landed on the protected route (not bounced).
    await expect(signedInPage).toHaveURL(/\/parc-de-logements/);
  });

  test('keeps the session active across reloads', async ({ signedInPage }) => {
    await signedInPage.goto('/parc-de-logements');
    await signedInPage.reload();

    // useSession() reads from the cookie cache; reload should NOT bounce
    // us to login.
    await expect(signedInPage).toHaveURL(/\/parc-de-logements/);
  });

  test.describe('with a fresh context', () => {
    test('still requires login after browser restart', async ({ browser }) => {
      // Brand-new context = no cookies. Repro the "first visit" experience.
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/parc-de-logements');
      await page.waitForURL('**/connexion**');

      await signIn(page);
      await expect(page).toHaveURL(/\/parc-de-logements/);

      await context.close();
    });
  });
});
