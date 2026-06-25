import { expect, test } from '../fixtures/auth';

/**
 * A suspended user (suspended_at is set on the legacy users row) should see
 * the SuspendedUserModal on the next post-login render. This test reaches
 * into the API to suspend the seeded test user, performs a fresh login, then
 * cleans up.
 *
 * Skipped until the API exposes a test-only suspend endpoint (or the suite
 * gets its own dedicated suspended user). Documented here so the scenario
 * isn't forgotten and the test slot is reserved.
 *
 * TODO(pilot follow-up): wire to a dedicated `suspended@zlv.fr` seed user
 * to remove the test-only API requirement.
 */
test.describe('Suspended user', () => {
  test.skip('shows the SuspendedUserModal on login', async ({
    signedInPage
  }) => {
    await expect(
      signedInPage.getByRole('dialog', { name: /suspendu|compte suspendu/i })
    ).toBeVisible();
  });
});
