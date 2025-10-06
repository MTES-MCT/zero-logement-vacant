import { faker } from '@faker-js/faker/locale/fr';
import type { Store } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  OWNER_RANKS,
  UserRole,
  type CampaignDTO,
  type GroupDTO,
  type HousingDTO,
  type HousingOwnerDTO,
  type UserDTO
} from '@zerologementvacant/models';
import {
  genCampaignDTO,
  genGroupDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import data from '~/mocks/handlers/data';
import configureTestStore from '~/utils/test/storeUtils';
import GroupView from './GroupView';

interface RenderViewOptions {
  auth: UserDTO;
  group: GroupDTO | null;
  housings: ReadonlyArray<HousingDTO>;
  campaign: CampaignDTO | null;
}

describe('Group view', () => {
  const auth = genUserDTO(UserRole.USUAL);
  const user = userEvent.setup();

  beforeAll(async () => {
    data.users.push(auth);
  });

  function renderView(options: RenderViewOptions) {
    const store: Store = configureTestStore();

    if (options.group) {
      data.groups.push(options.group);
      data.housings.push(...options.housings);
      options.housings.forEach((housing) => {
        const owner = genOwnerDTO();
        data.owners.push(owner);

        const housingOwners = faker.helpers
          .arrayElements(OWNER_RANKS, { min: 0, max: 6 })
          .map((rank) => {
            const housingOwner: HousingOwnerDTO = {
              ...genHousingOwnerDTO(owner),
              rank: rank
            };
            return housingOwner;
          });
        data.housingOwners.set(housing.id, housingOwners);
      });
      data.groupHousings.set(options.group.id, options.housings);

      if (options.campaign) {
        data.campaigns.push({
          ...options.campaign,
          groupId: options.group.id
        });
      }
    }

    const id = options.group?.id ?? faker.string.uuid();

    const router = createMemoryRouter(
      [
        { path: '/parc-de-logements', element: 'Parc de logements' },
        { path: '/groupes/:id', element: <GroupView /> },
        { path: '/campagnes/:id', element: 'Campagne' }
      ],
      {
        initialEntries: [`/groupes/${id}`]
      }
    );

    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  it('should show NotFoundView if the group does not exist', async () => {
    renderView({
      auth,
      group: null,
      housings: [],
      campaign: null
    });

    const text = await screen.findByText('Page non trouvée');
    expect(text).toBeVisible();
  });

  it('should show NotFoundView if the group has been archived', async () => {
    const owner = genOwnerDTO();
    const housings = faker.helpers.multiple(() => genHousingDTO(owner));
    const group: GroupDTO = {
      ...genGroupDTO(auth, housings),
      archivedAt: new Date().toJSON()
    };
    const campaign = null;

    renderView({
      auth,
      group,
      housings,
      campaign
    });

    const text = await screen.findByText('Page non trouvée');
    expect(text).toBeVisible();
  });

  describe('Create a campaign from the group', () => {
    it('should display a modal to create a campaign', async () => {
      const owner = genOwnerDTO();
      const housings = faker.helpers.multiple(() => genHousingDTO(owner));
      const group = genGroupDTO(auth, housings);
      const campaign = null;

      renderView({
        auth,
        group,
        housings,
        campaign
      });

      const createCampaign = await screen.findByRole('button', {
        name: /^Créer une campagne/
      });
      expect(createCampaign).toBeEnabled();
      await user.click(createCampaign);
      const modal = await screen.findByRole('dialog');
      const title = await within(modal).findByLabelText(
        /^Titre de la campagne/
      );
      await user.type(title, 'Logements prioritaires');
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);

      const page = await screen.findByText('Campagne');
      expect(page).toBeVisible();
    });
  });

  describe('Remove the group', () => {
    it('should display a modal to archive the group', async () => {
      const group = genGroupDTO(auth);
      const owner = genOwnerDTO();
      const housings = faker.helpers.multiple(() => genHousingDTO(owner));
      const campaign = genCampaignDTO(group);

      renderView({
        auth,
        group,
        housings,
        campaign
      });

      const archiveGroup = await screen.findByText(/^Archiver le groupe/);
      await user.click(archiveGroup);
      const modal = await screen.findByRole('dialog');
      const confirm = await within(modal).findByText(/^Confirmer/);
      await user.click(confirm);

      const page = await screen.findByText('Parc de logements');
      expect(page).toBeVisible();
    });

    it('should display a "Remove" button if no campaign was created from the group', async () => {
      const group = genGroupDTO(auth);
      const owner = genOwnerDTO();
      const housings = faker.helpers.multiple(() => genHousingDTO(owner));
      const campaign = null;

      renderView({
        auth,
        group,
        housings,
        campaign
      });

      const removeGroup = await screen.findByText(/^Supprimer le groupe/);
      expect(removeGroup).toBeVisible();
    });
  });
});
