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
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import data from '~/mocks/handlers/data';
import configureTestStore from '~/utils/storeUtils';
import GroupViewNext from '../GroupViewNext';
import CampaignViewNext from '~/views/Campaign/CampaignViewNext';
import { genAuthUser } from '~/test/fixtures';
import { fromUserDTO } from '~/models/User';
import { fromEstablishmentDTO } from '~/models/Establishment';

vi.mock('posthog-js/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('posthog-js/react')>();
  return {
    ...mod,
    useFeatureFlagEnabled: vi.fn(),
    usePostHog: () => ({ capture: vi.fn() })
  };
});

interface RenderViewOptions {
  auth: UserDTO;
  group: GroupDTO | null;
  housings: ReadonlyArray<HousingDTO>;
  campaign: CampaignDTO | null;
}

describe('Group view', () => {
  const establishment = genEstablishmentDTO();
  const auth = genUserDTO(UserRole.USUAL, establishment);
  const user = userEvent.setup();

  beforeEach(async () => {
    const { useFeatureFlagEnabled } = await import('posthog-js/react');
    vi.mocked(useFeatureFlagEnabled).mockImplementation(
      (flag: string) => flag === 'new-campaigns'
    );
  });

  beforeAll(async () => {
    data.users.push(auth);
  });

  function renderView(options: RenderViewOptions) {
    data.users.push(options.auth);
    data.establishments.push(establishment);
    const store: Store = configureTestStore({
      auth: genAuthUser(fromUserDTO(auth), fromEstablishmentDTO(establishment))
    });

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
        { path: '/groupes/:id', element: <GroupViewNext /> },
        { path: '/campagnes/:id', element: <CampaignViewNext /> }
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

    return { router };
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
    const housings = faker.helpers.multiple(() => genHousingDTO());
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
    it('should create a campaign without sending date', async () => {
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const group = genGroupDTO(auth, housings);
      const campaign = null;

      const { router } = renderView({
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
      const title = await within(modal).findByLabelText(/^Nom/);
      await user.type(title, 'Logements prioritaires');
      const description = await within(modal).findByLabelText(/Description/);
      await user.type(description, 'Campagne pour les logements prioritaires');
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);

      expect(router.state.location.pathname).toMatch(/\/campagnes\/.+/);
    });

    it('should create a campaign with a sending date', async () => {
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const group = genGroupDTO(auth, housings);
      const campaign = null;

      const { router } = renderView({
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
      const title = await within(modal).findByLabelText(/^Nom/);
      await user.type(title, 'Logements prioritaires');
      const description = await within(modal).findByLabelText(/Description/);
      await user.type(description, 'Campagne pour les logements prioritaires');
      const sentAt = await within(modal).findByLabelText(/Date d’envoi/);
      await user.type(sentAt, '2024-12-31');
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);

      expect(router.state.location.pathname).toMatch(/\/campagnes\/.+/);
      // Implemented later...
      // const sentAtParagraph = await screen.findByText('Nombre de retours : 0');
      // expect(sentAtParagraph).toBeInTheDocument();
    })
  });

  describe('Rename the group', () => {
    it('should display a modal to rename the group', async () => {
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const group = genGroupDTO(auth, housings);
      const campaign = null;

      renderView({
        auth,
        group,
        housings,
        campaign
      });

      const modifier = await screen.findByRole('button', { name: /Modifier/ });
      await user.click(modifier);
      const modal = await screen.findByRole('dialog');
      const titleInput = await within(modal).findByLabelText(/Nom du groupe/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Nouveau nom');
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);

      const heading = await screen.findByRole('heading', {
        name: 'Nouveau nom',
        level: 1
      });
      expect(heading).toBeVisible();
    });
  });

  describe('Remove the group', () => {
    it('should display a "Remove" button', async () => {
      const group = genGroupDTO(auth);
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const campaign = null;

      renderView({
        auth,
        group,
        housings,
        campaign
      });

      const removeGroup = await screen.findByRole('button', {
        name: /^Supprimer le groupe/
      });
      expect(removeGroup).toBeVisible();
    });
  });
});
