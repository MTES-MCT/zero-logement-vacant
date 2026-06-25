import { expect, test } from '../fixtures/auth';

test.describe('Sign-out (auth-v2)', () => {
  test('clears the session cookie and bounces protected routes', async ({
    signedInPage,
    context
  }) => {
    // Sanity-check: we're signed in.
    const beforeCookies = await context.cookies();
    expect(
      beforeCookies.find((cookie) => cookie.name.includes('zlv.session_token'))
    ).toBeDefined();

    // Open the account dropdown at the top right of the header. The trigger's
    // label is the user's displayName so we target the wrapping <nav> instead,
    // which has a stable aria-label set by SmallHeader.
    await signedInPage
      .getByRole('navigation', { name: 'Navigation du compte utilisateur' })
      .getByRole('button')
      .click();

    // Then click "Se déconnecter" inside the opened dropdown.
    await signedInPage
      .getByRole('button', { name: /Se déconnecter/i })
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
