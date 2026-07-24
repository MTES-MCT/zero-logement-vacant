import { type Page } from '@playwright/test';

import { expect, test } from '../fixtures/auth';

/**
 * "Enregistrer une campagne" flow on the campaigns list: a two-step DSFR modal
 * (select a group → create a campaign from it).
 *
 * This lives in a real browser on purpose. The step 1 → step 2 transition
 * depends on DSFR initialising the step-2 `<dialog>` asynchronously after it
 * mounts; opening it too early throws `Cannot read properties of null (reading
 * 'modal')` and the whole flow crashes. jsdom cannot reproduce this — its
 * `window.dsfr` shim always returns a ready modal — so a component test would
 * stay green while the feature is broken. `expect(step 2).toBeVisible()` after
 * selecting a group is the regression guard.
 *
 * Requires the default user (`CYPRESS_EMAIL`) to be Usual/Admin (Visitors don't
 * see the button) with at least one eligible group (not archived, ≥1 housing).
 * Skips gracefully when no such group is seeded.
 */
test.describe('Save a campaign from a group', () => {
  const step1 = (page: Page) =>
    page.getByRole('dialog').filter({ hasText: 'Étape 1 sur 2' });
  const step2 = (page: Page) =>
    page.getByRole('dialog').filter({ hasText: 'Étape 2 sur 2' });

  /**
   * Opens step 1 and returns the first group's "Sélectionner" button plus
   * whether the establishment actually has an eligible group (the table renders
   * empty otherwise, and the caller skips).
   */
  async function openStep1(page: Page) {
    await page
      .getByRole('button', { name: 'Enregistrer une campagne' })
      .click();
    await expect(step1(page)).toBeVisible();

    const firstGroup = step1(page)
      .getByRole('button', { name: /^Sélectionner le groupe/ })
      .first();
    const hasGroup = await firstGroup
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    return { firstGroup, hasGroup };
  }

  test('creates a campaign through the two-step modal', async ({
    signedInPage: page
  }) => {
    await page.goto('/campagnes');
    await expect(
      page.getByRole('button', { name: 'Enregistrer une campagne' })
    ).toBeVisible();

    const { firstGroup, hasGroup } = await openStep1(page);
    test.skip(
      !hasGroup,
      'The default user has no eligible group — seed a non-archived group with housing to run this test.'
    );

    await firstGroup.click();

    // Regression guard: selecting a group must open step 2. This previously
    // crashed because step 2 was conditionally mounted and opened before its
    // DSFR `<dialog>` had initialised.
    await expect(step2(page)).toBeVisible();

    const name = `E2E save-campaign ${Date.now()}`;
    await step2(page).getByLabel(/^Nom/).fill(name);

    const created = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/groups\/[^/]+\/campaigns$/.test(response.url())
    );
    await step2(page).getByRole('button', { name: 'Confirmer' }).click();
    expect((await created).ok()).toBe(true);

    // Success: toast, modal closes, and the campaign lands in the list. The
    // flow deliberately stays on /campagnes (unlike the group-page flow, which
    // navigates to the new campaign).
    await expect(page.getByText('La campagne a été ajoutée')).toBeVisible();
    await expect(step2(page)).toBeHidden();

    // The new campaign is in the list — its delete button carries a unique,
    // exact accessible name, so it's a reliable per-campaign anchor.
    const deleteButton = page.getByRole('button', {
      name: `Supprimer la campagne ${name}`
    });
    await expect(deleteButton).toBeVisible();

    // Cleanup so the run is repeatable and doesn't pollute the environment.
    await deleteButton.click();
    await page
      .getByRole('dialog')
      .filter({ hasText: /Supprimer la campagne/ })
      .getByRole('button', { name: 'Confirmer' })
      .click();
    await expect(deleteButton).toHaveCount(0);
  });

  test('reopens step 2 when the same group is re-selected after cancelling', async ({
    signedInPage: page
  }) => {
    await page.goto('/campagnes');

    const { firstGroup, hasGroup } = await openStep1(page);
    test.skip(
      !hasGroup,
      'The default user has no eligible group — seed a non-archived group with housing to run this test.'
    );

    // Remember which group we picked so we re-select the SAME one.
    const groupLabel = await firstGroup.getAttribute('aria-label');
    expect(groupLabel).not.toBeNull();
    await firstGroup.click();
    await expect(step2(page)).toBeVisible();

    // Cancel step 2 without submitting.
    await page.keyboard.press('Escape');
    await expect(step2(page)).toBeHidden();

    // Re-run the flow and pick the same group again. This regressed once: the
    // reopen was a dead click because the step-2 open hung on a stale selection.
    await page
      .getByRole('button', { name: 'Enregistrer une campagne' })
      .click();
    await expect(step1(page)).toBeVisible();
    await step1(page)
      .getByRole('button', { name: groupLabel as string })
      .click();

    await expect(step2(page)).toBeVisible();
  });
});
