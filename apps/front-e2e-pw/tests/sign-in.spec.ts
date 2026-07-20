import { expect, signIn, test } from '../fixtures/auth';

test.describe('Sign-in', () => {
  test('logs in and sets the zlv.session_token cookie', async ({
    page,
    context
  }) => {
    await signIn(page);

    // Better Auth cookies are prefixed `zlv.` per
    // server/src/infra/auth.ts (`advanced.cookiePrefix: 'zlv'`).
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((cookie) =>
      cookie.name.includes('zlv.session_token')
    );
    expect(sessionCookie, 'session cookie should be set').toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
  });

  test('reflects the logged-in state in the header', async ({
    signedInPage
  }) => {
    // After sign-in, the header switcher (driven by useUser →
    // useAuth → useSession) should NOT show the "Connexion" link.
    await expect(
      signedInPage.getByRole('link', { name: /Connexion/i })
    ).toHaveCount(0);
  });
});
