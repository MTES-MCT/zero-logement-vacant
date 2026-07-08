import { loadConfig } from '../config';
import { expect, test } from '../fixtures/auth';
import { signIn } from '../fixtures/auth';

test.describe('Sign-in (auth-v2)', () => {
  test.skip(
    loadConfig().authMode !== 'auth-v2',
    'Run with E2E_AUTH_MODE=auth-v2 and a frontend with auth-v2'
  );

  test('logs in and sets the zlv.session_token cookie', async ({
    page,
    context
  }) => {
    await signIn(page);

    // Cookie shape — auth-v2 cookies are prefixed `zlv.` per
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
