import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UserRole,
  type CampaignDTO,
  type EstablishmentDTO,
  type UserDTO
} from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Order } from 'effect';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { HousingFiltersProvider } from '~/hooks/HousingFiltersContext';
import data from '~/mocks/handlers/data';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { factories } from '~/test/factories';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';
import CampaignListView from '~/views/Campaign/CampaignListView';
import CampaignView from '~/views/Campaign/CampaignView';

const establishment = genEstablishmentDTO();
const auth = genUserDTO(UserRole.USUAL, establishment);

describe('CampaignListView', () => {
  const user = userEvent.setup();

  describe('Name', () => {
    it('should sort by name', async () => {
      renderView();

      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par nom'
      });
      await user.click(sort);
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
      renderView();

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

  describe('Creation date', () => {
    it('should sort by creation date by default', async () => {
      renderView();

      const table = await screen.findByRole('table');
      const dates = await within(table)
        .findAllByText(/^\d{2}\/\d{2}\/\d{4}$/)
        .then((elements) => elements.map((element) => element.textContent));
      expect(dates.length).toBeGreaterThan(0);
      expect(dates).toBeSorted({
        descending: true,
        compare: (a: string, b: string) => {
          const map = (date: string): Date =>
            new Date(date.split('/').reverse().join('-'));
          return Order.mapInput(map)(Order.Date)(a, b);
        }
      });
    });
  });

  describe('Housing count', () => {
    it('should sort by housing count descending', async () => {
      renderView({
        campaigns: [
          factories
            .campaign(establishment)
            .build({ housingCount: 10 }, { associations: { createdBy: auth } }),
          factories
            .campaign(establishment)
            .build({ housingCount: 3 }, { associations: { createdBy: auth } }),
          factories
            .campaign(establishment)
            .build({ housingCount: 7 }, { associations: { createdBy: auth } })
        ]
      });

      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par nombre de logements'
      });
      await user.click(sort);

      const cells = await within(table).findAllByText(/^\d+ logements?$/);
      const counts = cells.map((cell) =>
        Number(cell.textContent?.split(' ')[0])
      );
      expect(counts.length).toBeGreaterThan(0);
      expect(counts).toBeSorted({
        descending: true
      });
    });
  });

  describe('Owner count', () => {
    it('should sort by owner count ascending', async () => {
      renderView({
        campaigns: [
          factories
            .campaign(establishment)
            .build({ ownerCount: 8 }, { associations: { createdBy: auth } }),
          factories
            .campaign(establishment)
            .build({ ownerCount: 2 }, { associations: { createdBy: auth } }),
          factories
            .campaign(establishment)
            .build({ ownerCount: 5 }, { associations: { createdBy: auth } })
        ]
      });

      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par nombre de propriétaires'
      });
      await user.click(sort);

      const cells = await within(table).findAllByText(/^\d+ propriétaires?$/);
      const counts = cells.map((cell) =>
        Number(cell.textContent?.split(' ')[0])
      );
      expect(counts.length).toBeGreaterThan(0);
      expect(counts).toBeSorted({
        descending: true
      });
    });
  });

  describe('Sending date', () => {
    it('should sort by sending date ascending', async () => {
      renderView({
        campaigns: [
          factories
            .campaign(establishment)
            .build(
              { sentAt: '2024-03-15' },
              { associations: { createdBy: auth } }
            ),
          factories
            .campaign(establishment)
            .build(
              { sentAt: '2024-01-10' },
              { associations: { createdBy: auth } }
            ),
          factories
            .campaign(establishment)
            .build(
              { sentAt: '2024-06-01' },
              { associations: { createdBy: auth } }
            )
        ]
      });

      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par date d\u2019envoi'
      });
      await user.click(sort);

      const headers = within(table).getAllByRole('columnheader');
      const sentAtIndex = headers.findIndex(
        (h) => h.textContent === 'Date d\u2019envoi'
      );
      const rows = within(table).getAllByRole('row');
      const dataRows = rows.slice(1);
      const dates = dataRows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells[sentAtIndex]?.textContent ?? '';
      });
      const nonEmpty = dates.filter(Boolean);
      expect(nonEmpty.length).toBeGreaterThan(0);
      expect(nonEmpty).toBeSorted({
        descending: false,
        compare: (a: string, b: string) => {
          const parse = (d: string) =>
            new Date(d.split('/').reverse().join('-'));
          return Order.mapInput(parse)(Order.Date)(a, b);
        }
      });
    });
  });

  describe('Return count', () => {
    it('should sort by return count ascending', async () => {
      renderView({
        campaigns: [
          factories
            .campaign(establishment)
            .build(
              {
                sentAt: '2024-01-01',
                housingCount: 10,
                returnCount: 5,
                returnRate: 0.5
              },
              { associations: { createdBy: auth } }
            ),
          factories
            .campaign(establishment)
            .build(
              {
                sentAt: '2024-01-01',
                housingCount: 10,
                returnCount: 1,
                returnRate: 0.1
              },
              { associations: { createdBy: auth } }
            ),
          factories
            .campaign(establishment)
            .build(
              {
                sentAt: '2024-01-01',
                housingCount: 10,
                returnCount: 3,
                returnRate: 0.3
              },
              { associations: { createdBy: auth } }
            )
        ]
      });

      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par nombre de retours'
      });
      await user.click(sort);

      const cells = await within(table).findAllByText(/^\d+ retours$/);
      const counts = cells.map((cell) =>
        Number(cell.textContent?.split(' ')[0])
      );
      expect(counts.length).toBeGreaterThan(0);
      expect(counts).toBeSorted({
        descending: true
      });
    });
  });

  describe('Return rate', () => {
    it('should sort by return rate ascending', async () => {
      renderView({
        campaigns: [
          factories
            .campaign(establishment)
            .build(
              {
                sentAt: '2024-01-01',
                housingCount: 10,
                returnCount: 5,
                returnRate: 0.5
              },
              { associations: { createdBy: auth } }
            ),
          factories
            .campaign(establishment)
            .build(
              {
                sentAt: '2024-01-01',
                housingCount: 10,
                returnCount: 1,
                returnRate: 0.1
              },
              { associations: { createdBy: auth } }
            ),
          factories
            .campaign(establishment)
            .build(
              {
                sentAt: '2024-01-01',
                housingCount: 10,
                returnCount: 3,
                returnRate: 0.3
              },
              { associations: { createdBy: auth } }
            )
        ]
      });

      const table = await screen.findByRole('table');
      const sort = await within(table).findByRole('button', {
        name: 'Trier par taux de retour'
      });
      await user.click(sort);

      const cells = await within(table).findAllByText(/^\d+(\.\d+)? %$/);
      const rates = cells.map((cell) =>
        parseFloat(cell.textContent?.replace(' %', '') ?? '0')
      );
      expect(rates.length).toBeGreaterThan(0);
      expect(rates).toBeSorted({
        descending: true
      });
    });
  });

  describe('Pagination', () => {
    it('should render a page size selector', async () => {
      renderView();

      await screen.findByRole('table');

      expect(
        screen.getByDisplayValue('50 résultats par page')
      ).toBeInTheDocument();
    });

    it('should limit visible rows according to page size', async () => {
      const campaigns = factories
        .campaign(establishment)
        .buildList(15, {}, { associations: { createdBy: auth } });
      renderView({ campaigns });

      await screen.findByRole('table');
      const select = screen.getByDisplayValue('50 résultats par page');
      await user.selectOptions(select, '10');

      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      // 1 header row + 10 data rows
      expect(rows).toHaveLength(11);
    });

    it('should navigate to the next page', async () => {
      const campaigns = factories
        .campaign(establishment)
        .buildList(15, {}, { associations: { createdBy: auth } });
      renderView({ campaigns });

      await screen.findByRole('table');
      const select = screen.getByDisplayValue('50 résultats par page');
      await user.selectOptions(select, '10');

      const page2 = await screen.findByTitle('Page 2');
      await user.click(page2);

      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      // 1 header row + 5 data rows
      expect(rows).toHaveLength(6);
    });
  });

  describe('Actions', () => {
    it('should remove a campaign', async () => {
      async function count() {
        return screen
          .findByText(/^\d+ campagnes$/)
          .then((element) => element.textContent?.split(' ').at(0) ?? '')
          .then((count) => Number(count));
      }

      renderView();

      const table = await screen.findByRole('table');
      const countBefore = await count();
      const [remove] = await within(table).findAllByRole('button', {
        name: /^Supprimer la campagne/
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

interface RenderViewOptions {
  auth?: UserDTO;
  establishment?: EstablishmentDTO;
  campaigns?: ReadonlyArray<CampaignDTO>;
}

function renderView(options?: RenderViewOptions) {
  const renderEstablishment = options?.establishment ?? establishment;
  const renderAuth = options?.auth ?? auth;
  const housings = faker.helpers.multiple(() => genHousingDTO(), {
    count: { min: 1, max: 10 }
  });
  const group = genGroupDTO(renderAuth, housings);
  const campaigns =
    options?.campaigns ??
    factories
      .campaign(renderEstablishment)
      .buildList(
        faker.number.int({ min: 3, max: 5 }),
        { groupId: group.id },
        { associations: { createdBy: renderAuth } }
      );

  data.establishments.push(renderEstablishment);
  data.users.push(renderAuth);
  data.campaigns.push(...campaigns);

  const store = configureTestStore({
    auth: genAuthUser(
      fromUserDTO(renderAuth),
      fromEstablishmentDTO(renderEstablishment)
    )
  });
  const router = createMemoryRouter(
    [
      {
        path: '/campagnes',
        element: <CampaignListView />
      },
      {
        path: '/campagnes/:id',
        element: <CampaignView />
      }
    ],
    { initialEntries: ['/campagnes'] }
  );

  render(
    <Provider store={store}>
      <HousingFiltersProvider>
        <RouterProvider router={router} />
      </HousingFiltersProvider>
    </Provider>
  );

  return { router };
}
