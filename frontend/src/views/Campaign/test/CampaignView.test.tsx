import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UserRole,
  type CampaignDTO,
  type HousingDTO
} from '@zerologementvacant/models';
import {
  genDraftDTO,
  genEstablishmentDTO,
  genHousingDTO,
  genSenderDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { HousingFiltersProvider } from '~/hooks/HousingFiltersContext';
import data from '~/mocks/handlers/data';
import { factories } from '~/test/factories';
import configureTestStore from '~/utils/storeUtils';
import HousingListView from '~/views/HousingList/HousingListView';

import CampaignView from '../CampaignView';

vi.mock('@zerologementvacant/pdf', () => ({
  usePDF: vi.fn(() => [
    { url: null, loading: false, error: undefined },
    vi.fn()
  ]),
  CampaignDocument: ({ children }: any) => children,
  CampaignPage: vi.fn(() => null)
}));

describe('CampaignView', () => {
  const user = userEvent.setup();
  const establishment = genEstablishmentDTO();
  const auth = genUserDTO(UserRole.USUAL, establishment);

  interface RenderViewOptions {
    housings?: HousingDTO[];
  }

  function renderView(campaign: CampaignDTO, options?: RenderViewOptions) {
    data.campaigns.push(campaign);
    if (options?.housings?.length) {
      data.housings.push(...options.housings);
      data.campaignHousings.set(
        campaign.id,
        options.housings.map((h) => ({ id: h.id }))
      );
      options.housings.forEach((housing) => {
        data.housingCampaigns.set(housing.id, [{ id: campaign.id }]);
      });
    }

    const router = createMemoryRouter(
      [
        { path: '/campagnes', element: <div>Campagnes</div> },
        { path: '/campagnes/:id', element: <CampaignView /> },
        { path: '/parc-de-logements', element: <HousingListView /> }
      ],
      { initialEntries: [`/campagnes/${campaign.id}`] }
    );

    render(
      <Provider store={configureTestStore()}>
        <HousingFiltersProvider>
          <RouterProvider router={router} />
        </HousingFiltersProvider>
      </Provider>
    );

    return { router };
  }

  it('renders the campaign title', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        title: 'Ma campagne test',
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    renderView(campaign);

    expect(
      await screen.findByRole('heading', { name: 'Ma campagne test', level: 1 })
    ).toBeInTheDocument();
  });

  it('shows a breadcrumb link to Campagnes', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    renderView(campaign);

    expect(
      await screen.findByRole('link', { name: /campagnes/i })
    ).toBeInTheDocument();
  });

  it('shows a button to set sentAt when sentAt is null', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    renderView(campaign);

    expect(
      await screen.findByRole('button', {
        name: /indiquer la date d\u2019envoi/i
      })
    ).toBeInTheDocument();
  });

  it('opens the sent-at modal on button click', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    renderView(campaign);

    await screen.findByRole('button', {
      name: /indiquer la date d\u2019envoi/i
    });
    await user.click(
      screen.getByRole('button', { name: /indiquer la date d\u2019envoi/i })
    );

    const modal = document.getElementById('campaign-sent-at-modal');
    expect(modal?.textContent).toMatch(/permet/);
  });

  it('opens a confirmation modal when clicking delete', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );
    renderView(campaign);
    await screen.findByRole('heading', { level: 1 });

    await user.click(
      screen.getByRole('button', { name: /supprimer la campagne/i })
    );

    expect(
      await screen.findByRole('dialog', { name: /supprimer la campagne/i })
    ).toBeVisible();
  });

  it('navigates to /campagnes after confirming deletion', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    const { router } = renderView(campaign);

    await screen.findByRole('heading', { level: 1 });
    await user.click(
      screen.getByRole('button', { name: /supprimer la campagne/i })
    );
    await screen.findByRole('dialog', { name: /supprimer la campagne/i });
    await user.click(screen.getByRole('button', { name: /confirmer/i }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/campagnes')
    );
  });

  it('does not navigate when cancelling deletion', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    const { router } = renderView(campaign);

    await screen.findByRole('heading', { level: 1 });
    await user.click(
      screen.getByRole('button', { name: /supprimer la campagne/i })
    );
    await screen.findByRole('dialog', { name: /supprimer la campagne/i });
    await user.click(screen.getByRole('button', { name: /annuler/i }));
    expect(router.state.location.pathname).toBe(`/campagnes/${campaign.id}`);
  });

  it('displays the button "Voir les logements"', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    renderView(campaign);

    expect(
      await screen.findByRole('button', { name: /voir les logements/i })
    ).toBeInTheDocument();
  });

  it('redirects to /parc-de-logements on click on "Voir les logements"', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );
    const housings: HousingDTO[] = faker.helpers.multiple(() =>
      genHousingDTO()
    );

    const { router } = renderView(campaign, {
      housings
    });

    await screen.findByRole('heading', { level: 1 });
    await user.click(
      screen.getByRole('button', { name: /voir les logements/i })
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/parc-de-logements');
    });
  });

  it('displays the sentAt date in dd/MM/yyyy format when set', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: '2024-03-15T00:00:00.000Z',
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );

    renderView(campaign);

    expect(await screen.findByText('15/03/2024')).toBeInTheDocument();
  });

  it('renders the signatory upload sections in the Courrier tab', async () => {
    const campaign = factories.campaign(establishment).build(
      {
        sentAt: null,
        returnCount: null
      },
      { associations: { createdBy: auth } }
    );
    const draft = genDraftDTO(genSenderDTO());
    data.drafts.push(draft);
    data.campaignDrafts.set(campaign.id, [{ id: draft.id }]);

    renderView(campaign);

    await screen.findByRole('heading', { level: 1 });
    const courrierTab = await screen.findByRole('tab', { name: /courrier/i });
    await user.click(courrierTab);
    expect(
      await screen.findByRole('heading', {
        name: 'Signature du premier expéditeur',
        level: 4
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Signature du second expéditeur',
        level: 4
      })
    ).toBeInTheDocument();
  });
});
