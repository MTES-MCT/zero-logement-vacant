import { loadConfig } from '../config';
import { expect, signIn, test } from '../fixtures/auth';

/**
 * Only meaningful for a test user who has access to MULTIPLE establishments
 * (the switcher is hidden otherwise — see `canChangeEstablishment` in
 * `useUser.tsx`). Skipped at runtime when the dropdown isn't present.
 */
test.describe('Change establishment via header switcher', () => {
  test.skip(
    loadConfig().authMode !== 'auth-v2',
    'Run with E2E_AUTH_MODE=auth-v2 and a frontend with auth-v2'
  );

  test('updates the active establishment without a full reload', async ({
    page
  }) => {
    const config = loadConfig();
    if (config.multi) {
      await signIn(page, config.multi);
    } else {
      await signIn(page);
    }

    const switcher = page.locator('header').getByRole('combobox').first();
    const hostname = new URL(config.baseURL).hostname;
    const expectsMultiEstablishment =
      Boolean(config.multi) || hostname === 'localhost' || hostname === '127.0.0.1';

    if (expectsMultiEstablishment) {
      await expect(switcher).toBeVisible({ timeout: 15_000 });
    } else {
      await switcher.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {
        // Single-establishment users render static text instead of a switcher.
      });
      const isMultiEstablishment = await switcher.isVisible().catch(() => false);
      test.skip(
        !isMultiEstablishment,
        'Test user has only one establishment — set CYPRESS_MULTI_EMAIL/CYPRESS_MULTI_PASSWORD to assert switching'
      );
    }

    // Capture the navigation entries count to assert no full reload.
    const navEntriesBefore = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    );

    const currentName = await switcher.inputValue();

    await switcher.click();
    // Pick an option different from the current one — option ordering depends
    // on the autocomplete focus state.
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();
    let targetIndex = -1;
    let targetName = '';
    for (let index = 0; index < (await options.count()); index += 1) {
      const optionName = (await options.nth(index).textContent())?.trim();
      if (optionName && optionName !== currentName.trim()) {
        targetIndex = index;
        targetName = optionName;
        break;
      }
    }
    expect(
      targetIndex,
      'the establishment switcher should expose another establishment'
    ).toBeGreaterThanOrEqual(0);
    const [switchResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/account/establishments/'),
        { timeout: 10_000 }
      ),
      options.nth(targetIndex).click()
    ]);
    expect(switchResponse.ok()).toBe(true);
    expect(switchResponse.request().headers()['x-access-token']).toBeUndefined();

    // The session re-fetches and the header label updates to the new name.
    await expect(switcher).toHaveValue(targetName);

    const navEntriesAfter = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    );
    expect(
      navEntriesAfter,
      'no full page reload should occur on establishment switch'
    ).toBe(navEntriesBefore);
  });
});
