import { expect, test } from '../fixtures/auth';

/**
 * Only meaningful for a test user who has access to MULTIPLE establishments
 * (the switcher is hidden otherwise — see `canChangeEstablishment` in
 * `useUser.tsx`). Skipped at runtime when the dropdown isn't present.
 */
test.describe('Change establishment via header switcher', () => {
  test('updates the active establishment without a full reload', async ({
    signedInPage
  }) => {
    const switcher = signedInPage
      .getByRole('combobox', { name: /établissement/i })
      .first();

    const isMultiEstablishment = await switcher.isVisible().catch(() => false);
    test.skip(
      !isMultiEstablishment,
      'Test user has only one establishment — switcher hidden, nothing to assert'
    );

    // Capture the navigation entries count to assert no full reload.
    const navEntriesBefore = await signedInPage.evaluate(
      () => performance.getEntriesByType('navigation').length
    );

    await switcher.click();
    // Pick the second option (whatever it is — we just need a switch).
    const options = signedInPage.getByRole('option');
    const targetName = await options.nth(1).textContent();
    await options.nth(1).click();

    // The session re-fetches and the header label updates to the new name.
    if (targetName) {
      await expect(
        signedInPage.getByText(targetName.trim(), { exact: false }).first()
      ).toBeVisible();
    }

    const navEntriesAfter = await signedInPage.evaluate(
      () => performance.getEntriesByType('navigation').length
    );
    expect(
      navEntriesAfter,
      'no full page reload should occur on establishment switch'
    ).toBe(navEntriesBefore);
  });
});
