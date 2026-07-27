import { type Locator, type Page } from '@playwright/test';

import { expect, test } from '../fixtures/auth';

/**
 * Full journey from the housing list to a created campaign, going through a
 * freshly created group: select every housing, create a group from that
 * selection, then create a campaign from it either via the group's own page
 * ("Créer une campagne") or via the campaigns list ("Enregistrer une
 * campagne"). Both paths must redirect to the new campaign's own page
 * (`/campagnes/:id`) on success — see `save-campaign.spec.ts` for the
 * dedicated regression guard on the two-step modal itself.
 *
 * Each test creates its own group and campaign (unique, timestamped names)
 * and deletes both afterwards, so runs are repeatable and parallel-safe.
 */

function nearFutureDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

async function createGroupFromAllHousings(
  page: Page,
  title: string
): Promise<{ groupId: string }> {
  await page.goto('/parc-de-logements');
  await page
    .getByRole('checkbox', { name: 'Sélectionner tous les éléments' })
    .click();
  await page.getByRole('button', { name: 'Intégrer dans un groupe' }).click();
  await page.getByRole('button', { name: 'Créer un nouveau groupe' }).click();

  const groupDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Créer un nouveau groupe de logements' });
  await groupDialog
    .getByRole('textbox', { name: /^Nom du groupe/ })
    .fill(title);
  await groupDialog
    .getByRole('textbox', { name: /^Description du groupe/ })
    .fill('Groupe créé par le test e2e');

  const created = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && /\/groups$/.test(response.url())
  );
  await groupDialog.getByRole('button', { name: 'Créer un groupe' }).click();
  const createdResponse = await created;
  expect(createdResponse.ok()).toBe(true);
  const { id: groupId } = await createdResponse.json();

  await page.waitForURL(`**/groupes/${groupId}`);
  return { groupId };
}

/**
 * Fills the (shared) campaign creation form inside the given dialog and
 * submits it, returning the id of the campaign the API created.
 */
async function submitCampaignForm(
  dialog: Locator,
  options: { name: string; sentAt?: string }
): Promise<{ campaignId: string }> {
  await dialog.getByLabel(/^Nom/).fill(options.name);
  if (options.sentAt) {
    await dialog.getByLabel(/Date d’envoi/).fill(options.sentAt);
  }

  const created = dialog
    .page()
    .waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/groups\/[^/]+\/campaigns$/.test(response.url())
    );
  await dialog.getByRole('button', { name: 'Confirmer' }).click();
  const createdResponse = await created;
  expect(createdResponse.ok()).toBe(true);
  const { id: campaignId } = await createdResponse.json();

  return { campaignId };
}

async function cleanUp(page: Page, groupId: string): Promise<void> {
  await page.getByRole('button', { name: 'Supprimer la campagne' }).click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Supprimer la campagne' })
    .getByRole('button', { name: 'Confirmer' })
    .click();

  await page.goto(`/groupes/${groupId}`);
  await page.getByRole('button', { name: 'Supprimer le groupe' }).click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Supprimer le groupe' })
    .getByRole('button', { name: 'Confirmer' })
    .click();
}

test.describe('Create a campaign from a freshly created group', () => {
  test.describe('From the group page', () => {
    test('redirects to the new campaign without a sending date', async ({
      signedInPage: page
    }) => {
      const { groupId } = await createGroupFromAllHousings(
        page,
        `E2E group ${Date.now()}`
      );

      await page.getByRole('button', { name: /^Créer une campagne/ }).click();
      const modal = page
        .getByRole('dialog')
        .filter({ hasText: /Créer une campagne/ });
      const name = `E2E campaign ${Date.now()}`;
      const { campaignId } = await submitCampaignForm(modal, { name });

      await page.waitForURL(`**/campagnes/${campaignId}`);
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

      await cleanUp(page, groupId);
    });

    test('redirects to the new campaign with a sending date in the near future', async ({
      signedInPage: page
    }) => {
      const { groupId } = await createGroupFromAllHousings(
        page,
        `E2E group ${Date.now()}`
      );

      await page.getByRole('button', { name: /^Créer une campagne/ }).click();
      const modal = page
        .getByRole('dialog')
        .filter({ hasText: /Créer une campagne/ });
      const name = `E2E campaign ${Date.now()}`;
      const { campaignId } = await submitCampaignForm(modal, {
        name,
        sentAt: nearFutureDate()
      });

      await page.waitForURL(`**/campagnes/${campaignId}`);
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

      await cleanUp(page, groupId);
    });
  });

  test.describe('From the campaign list ("Enregistrer une campagne")', () => {
    test('redirects to the new campaign without a sending date', async ({
      signedInPage: page
    }) => {
      const title = `E2E group ${Date.now()}`;
      const { groupId } = await createGroupFromAllHousings(page, title);

      await page.goto('/campagnes');
      await page
        .getByRole('button', { name: 'Enregistrer une campagne' })
        .click();
      const step1 = page
        .getByRole('dialog')
        .filter({ hasText: 'Étape 1 sur 2' });
      await expect(step1).toBeVisible();
      await step1
        .getByRole('button', { name: `Sélectionner le groupe ${title}` })
        .click();

      const step2 = page
        .getByRole('dialog')
        .filter({ hasText: 'Étape 2 sur 2' });
      await expect(step2).toBeVisible();
      const name = `E2E campaign ${Date.now()}`;
      const { campaignId } = await submitCampaignForm(step2, { name });

      await page.waitForURL(`**/campagnes/${campaignId}`);
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

      await cleanUp(page, groupId);
    });

    test('redirects to the new campaign with a sending date in the near future', async ({
      signedInPage: page
    }) => {
      const title = `E2E group ${Date.now()}`;
      const { groupId } = await createGroupFromAllHousings(page, title);

      await page.goto('/campagnes');
      await page
        .getByRole('button', { name: 'Enregistrer une campagne' })
        .click();
      const step1 = page
        .getByRole('dialog')
        .filter({ hasText: 'Étape 1 sur 2' });
      await expect(step1).toBeVisible();
      await step1
        .getByRole('button', { name: `Sélectionner le groupe ${title}` })
        .click();

      const step2 = page
        .getByRole('dialog')
        .filter({ hasText: 'Étape 2 sur 2' });
      await expect(step2).toBeVisible();
      const name = `E2E campaign ${Date.now()}`;
      const { campaignId } = await submitCampaignForm(step2, {
        name,
        sentAt: nearFutureDate()
      });

      await page.waitForURL(`**/campagnes/${campaignId}`);
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

      await cleanUp(page, groupId);
    });
  });
});
