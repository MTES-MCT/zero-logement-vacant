import { faker } from '@faker-js/faker/locale/fr';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { addDays, format } from 'date-fns';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { HousingFiltersProvider } from '~/hooks/HousingFiltersContext';
import data from '~/mocks/handlers/data';
import { MockAuthProvider } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';
import CampaignListView from '~/views/Campaign/CampaignListView';
import CampaignView from '~/views/Campaign/CampaignView';
import GroupView from '~/views/Group/GroupView';
import HousingListTabsProvider from '~/views/HousingList/HousingListTabsProvider';
import HousingListView from '~/views/HousingList/HousingListView';

describe('Housing list to campaign flows', () => {
  const user = userEvent.setup();

  function renderApp() {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const owner = genOwnerDTO();
    const housings = faker.helpers.multiple(() => genHousingDTO(), {
      count: { min: 2, max: 4 }
    });
    const housingOwners = housings.map((housing) => ({
      ...genHousingOwnerDTO(owner),
      housingId: housing.id,
      ownerId: owner.id,
      rank: 1 as const
    }));

    data.establishments.push(establishment);
    data.users.push(auth);
    data.owners.push(owner);
    data.housings.push(...housings);
    housingOwners.forEach((housingOwner) => {
      data.housingOwners.set(housingOwner.housingId, [housingOwner]);
    });

    const store = configureTestStore();
    const router = createMemoryRouter(
      [
        {
          path: '/parc-de-logements',
          element: (
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          )
        },
        { path: '/groupes/:id', element: <GroupView /> },
        { path: '/campagnes', element: <CampaignListView /> },
        { path: '/campagnes/:id', element: <CampaignView /> }
      ],
      { initialEntries: ['/parc-de-logements'] }
    );

    render(
      <Provider store={store}>
        <MockAuthProvider options={{ user: auth, establishment }}>
          <HousingFiltersProvider>
            <RouterProvider router={router} />
          </HousingFiltersProvider>
        </MockAuthProvider>
      </Provider>
    );

    return { router };
  }

  /**
   * Selects every housing via the table’s header checkbox, then creates a
   * new group from that selection, and waits for the redirect to the new
   * group’s page.
   */
  async function selectAllHousingsAndCreateGroup(
    router: ReturnType<typeof createMemoryRouter>,
    title: string
  ) {
    const selectAll = await screen.findByRole('checkbox', {
      name: 'Sélectionner tous les éléments'
    });
    await user.click(selectAll);

    const addToGroup = await screen.findByRole('button', {
      name: 'Intégrer dans un groupe'
    });
    await user.click(addToGroup);

    const createGroup = await screen.findByRole('button', {
      name: 'Créer un nouveau groupe'
    });
    await user.click(createGroup);

    const groupName = await screen.findByRole('textbox', {
      name: /Nom du groupe/
    });
    await user.type(groupName, title);
    const groupDescription = await screen.findByRole('textbox', {
      name: /Description/
    });
    await user.type(groupDescription, 'Description du groupe');
    const confirm = await screen.findByRole('button', {
      name: /Créer un groupe/
    });
    await user.click(confirm);

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/groupes\/.+/);
    });
  }

  describe('Create a campaign from the group page', () => {
    async function createCampaignFromGroupView(sentAt?: string) {
      const createCampaign = await screen.findByRole('button', {
        name: /^Créer une campagne/
      });
      await user.click(createCampaign);
      const modal = await screen.findByRole('dialog');
      const title = await within(modal).findByLabelText(/^Nom/);
      await user.type(title, 'Campagne depuis le groupe');
      if (sentAt) {
        const sentAtInput = await within(modal).findByLabelText(/Date d’envoi/);
        await user.type(sentAtInput, sentAt);
      }
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);
    }

    it('should redirect to the new campaign’s page without a sending date', async () => {
      const { router } = renderApp();

      await selectAllHousingsAndCreateGroup(router, 'Tous les logements');
      await createCampaignFromGroupView();

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/^\/campagnes\/.+/);
      });
    });

    it('should redirect to the new campaign’s page with a sending date in the near future', async () => {
      const { router } = renderApp();
      const sentAt = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      await selectAllHousingsAndCreateGroup(router, 'Tous les logements');
      await createCampaignFromGroupView(sentAt);

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/^\/campagnes\/.+/);
      });
    });
  });

  describe('Save a campaign from the campaign list view', () => {
    async function saveCampaignFromGroup(
      router: ReturnType<typeof createMemoryRouter>,
      groupTitle: string,
      sentAt?: string
    ) {
      act(() => {
        router.navigate('/campagnes');
      });

      const openButton = await screen.findByRole('button', {
        name: 'Enregistrer une campagne'
      });
      await user.click(openButton);

      const selectDialog = await screen.findByRole('dialog');
      const selectButton = await within(selectDialog).findByRole('button', {
        name: `Sélectionner le groupe ${groupTitle}`
      });
      await user.click(selectButton);

      const createDialog = await screen.findByRole('dialog');
      await within(createDialog).findByText('Étape 2 sur 2');
      const title = await within(createDialog).findByLabelText(/^Nom/);
      await user.type(title, 'Campagne depuis la liste');
      if (sentAt) {
        const sentAtInput =
          await within(createDialog).findByLabelText(/Date d’envoi/);
        await user.type(sentAtInput, sentAt);
      }
      const confirm = await within(createDialog).findByText('Confirmer');
      await user.click(confirm);
    }

    it('should redirect to the new campaign’s page without a sending date', async () => {
      const { router } = renderApp();

      await selectAllHousingsAndCreateGroup(router, 'Logements du groupe');
      await saveCampaignFromGroup(router, 'Logements du groupe');

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/^\/campagnes\/.+/);
      });
    });

    it('should redirect to the new campaign’s page with a sending date in the near future', async () => {
      const { router } = renderApp();
      const sentAt = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      await selectAllHousingsAndCreateGroup(router, 'Logements programmés');
      await saveCampaignFromGroup(router, 'Logements programmés', sentAt);

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/^\/campagnes\/.+/);
      });
    });
  });
});
