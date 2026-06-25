import { expect, test } from '../fixtures/auth';

test.describe('Sign-out (auth-v2)', () => {
  test('clears the session cookie and bounces protected routes', async ({
    signedInPage,
    context
  }) => {
    // Sanity-check: we're signed in.
    const beforeCookies = await context.cookies();
    expect(
      beforeCookies.find((c) => c.name.includes('zlv.session_token'))
    ).toBeDefined();

    // The header "Déconnexion" / "Se déconnecter" link drives the sign-out.
    await signedInPage
      .getByRole('button', { name: /Déconnexion|Se déconnecter/i })
      .first()
      .click();

    // Header reverts to guest state.
    await expect(
      signedInPage.getByRole('link', { name: /Connexion/i }).first()
    ).toBeVisible();

    // Session cookie is gone.
    const afterCookies = await context.cookies();
    expect(
      afterCookies.find((c) => c.name.includes('zlv.session_token'))
    ).toBeUndefined();

    // Protected route bounces again.
    await signedInPage.goto('/parc-de-logements');
    await signedInPage.waitForURL('**/connexion**');
  });
});
