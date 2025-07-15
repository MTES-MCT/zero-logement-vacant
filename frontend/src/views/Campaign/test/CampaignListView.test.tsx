import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { CAMPAIGN_STATUS_LABELS } from '@zerologementvacant/models';
import { genCampaignDTO } from '@zerologementvacant/models/fixtures';
import configureTestStore from '../../../utils/test/storeUtils';
import CampaignListView from '../CampaignListView';
import data from '../../../mocks/handlers/data';
import { DEFAULT_ORDER } from '@zerologementvacant/utils';

describe('CampaignListView', () => {
  const user = userEvent.setup();

  beforeAll(() => {
    const campaigns = Array.from({ length: 10 }, () => genCampaignDTO());
    data.campaigns.push(...campaigns);
  });

  function setup() {
    const store = configureTestStore();
    const router = createMemoryRouter(
      [
        {
          path: '/campagnes',
          element: <CampaignListView />
        }
      ],
      { initialEntries: ['/campagnes'] }
    );

    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  async function resetSort() {
    let sort = await screen.findByRole('button', {
      name: 'Trier par date de création'
    });
    await user.click(sort);
    sort = await screen.findByRole('button', {
      name: 'Trier par date de création'
    });
    await user.click(sort);
  }

  describe('Title', () => {
    it('should sort by title', async () => {
      setup();

      await resetSort();
      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par titre'
      });
      await user.click(sort);
      const links = await within(table).findAllByRole('link', {
        name: (content) =>
          data.campaigns.some((campaign) => campaign.title === content)
      });
      const titles = links.map((link) => link.textContent);
      expect(titles.length).toBeGreaterThan(0);
      expect(titles).toBeSorted({
        descending: true
      });
    });

    it('should link to the campaign page', async () => {
      setup();

      const table = await screen.findByRole('table');
      const links = await within(table).findAllByRole('link', {
        name: (content) =>
          data.campaigns.some((campaign) => campaign.title === content)
      });
      expect(links.length).toBeGreaterThan(0);
      expect(links).toSatisfyAll<HTMLLinkElement>((link) => {
        return /\/campagnes\/.+$/.test(link.href);
      });
    });
  });

  describe('Status', () => {
    it('should sort by status', async () => {
      setup();

      await resetSort();
      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par statut'
      });
      await user.click(sort);
      const statuses = await within(table).findAllByText((content) =>
        Object.values(CAMPAIGN_STATUS_LABELS).includes(content)
      );
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses).toBeSorted({
        key: 'textContent',
        descending: true
      });
    });
  });

  describe('Creation date', () => {
    it('should sort by creation date', async () => {
      setup();

      await resetSort();
      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par date de création'
      });
      await user.click(sort);
      const dates = await within(table)
        .findAllByText(/^\d{2}\/\d{2}\/\d{4}$/)
        .then((elements) => elements.map((element) => element.textContent));
      expect(dates.length).toBeGreaterThan(0);
      expect(dates).toBeSorted({
        descending: true,
        compare: (a: string, b: string) => {
          const map = (date: string): Date =>
            new Date(date.split('/').toReversed().join('-'));
          console.log(a, b);
          return DEFAULT_ORDER(map(a), map(b));
        }
      });
    });
  });

  describe('Sending date', () => {
    // Conflicts with createdAt
    it.todo('should sort by sending date');
  });

  describe('Actions', () => {
    it('should remove a campaign', async () => {
      async function count() {
        return screen
          .findByText(/^\d+ campagnes$/)
          .then((element) => element.textContent?.split(' ').at(0) ?? '')
          .then((count) => Number(count));
      }

      setup();

      const table = await screen.findByRole('table');
      const countBefore = await count();
      const [remove] = await within(table).findAllByRole('button', {
        name: 'Supprimer la campagne'
      });
      await user.click(remove);
      const dialog = await screen.findByRole('dialog');
      const confirm = await within(dialog).findByRole('button', {
        name: 'Confirmer'
      });
      await user.click(confirm);
      const countAfter = await count();
      expect(countAfter).toBe(countBefore ? countBefore - 1 : false);
    });
  });
});
