import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { genCampaignDTO, genDraftDTO, genSenderDTO } from '@zerologementvacant/models/fixtures';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import data from '~/mocks/handlers/data';
import configureTestStore from '~/utils/storeUtils';
import CampaignView from '../CampaignView';

vi.mock('@zerologementvacant/pdf', () => ({
  usePDF: vi.fn(() => [{ url: null, loading: false, error: undefined }, vi.fn()]),
  CampaignDocument: ({ children }: any) => children,
  CampaignPage: vi.fn(() => null)
}));

vi.mock('posthog-js/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('posthog-js/react')>();
  return {
    ...mod,
    useFeatureFlagEnabled: vi.fn(),
    usePostHog: () => ({ capture: vi.fn() })
  };
});

describe('CampaignView', () => {
  const user = userEvent.setup();

  function renderView(campaign: ReturnType<typeof genCampaignDTO>) {
    data.campaigns.push(campaign);

    const router = createMemoryRouter(
      [
        { path: '/campagnes', element: <div>Campagnes</div> },
        { path: '/campagnes/:id', element: <CampaignView /> }
      ],
      { initialEntries: [`/campagnes/${campaign.id}`] }
    );

    render(
      <Provider store={configureTestStore()}>
        <RouterProvider router={router} />
      </Provider>
    );

    return { router };
  }

  it('renders the campaign title', async () => {
    // Arrange + Act
    const campaign = { ...genCampaignDTO(), title: 'Ma campagne test', sentAt: undefined, returnCount: null };
    renderView(campaign);

    // Assert
    expect(await screen.findByRole('heading', { name: 'Ma campagne test', level: 1 })).toBeInTheDocument();
  });

  it('shows a breadcrumb link to Campagnes', async () => {
    // Arrange + Act
    const campaign = { ...genCampaignDTO(), sentAt: undefined, returnCount: null };
    renderView(campaign);

    // Assert
    expect(await screen.findByRole('link', { name: /campagnes/i })).toBeInTheDocument();
  });

  it('shows a button to set sentAt when sentAt is null', async () => {
    // Arrange + Act
    const campaign = { ...genCampaignDTO(), sentAt: undefined, returnCount: null };
    renderView(campaign);

    // Assert
    expect(
      await screen.findByRole('button', { name: /indiquer la date d\u2019envoi/i })
    ).toBeInTheDocument();
  });

  it('opens the sent-at modal on button click', async () => {
    // Arrange
    const campaign = { ...genCampaignDTO(), sentAt: undefined, returnCount: null };
    renderView(campaign);
    await screen.findByRole('button', { name: /indiquer la date d\u2019envoi/i });

    // Act
    await user.click(screen.getByRole('button', { name: /indiquer la date d\u2019envoi/i }));

    // Assert
    const modal = document.getElementById('campaign-sent-at-modal');
    expect(modal?.textContent).toMatch(/permet/);
  });

  it('opens a confirmation modal when clicking delete', async () => {
    // Arrange
    const campaign = { ...genCampaignDTO(), sentAt: undefined, returnCount: null };
    renderView(campaign);
    await screen.findByRole('heading', { level: 1 });

    // Act
    await user.click(screen.getByRole('button', { name: /supprimer la campagne/i }));

    // Assert
    expect(
      await screen.findByRole('dialog', { name: /supprimer la campagne/i })
    ).toBeVisible();
  });

  it('navigates to /campagnes after confirming deletion', async () => {
    // Arrange
    const campaign = { ...genCampaignDTO(), sentAt: undefined, returnCount: null };
    const { router } = renderView(campaign);
    await screen.findByRole('heading', { level: 1 });

    // Act
    await user.click(screen.getByRole('button', { name: /supprimer la campagne/i }));
    await screen.findByRole('dialog', { name: /supprimer la campagne/i });
    await user.click(screen.getByRole('button', { name: /confirmer/i }));

    // Assert
    await waitFor(() => expect(router.state.location.pathname).toBe('/campagnes'));
  });

  it('does not navigate when cancelling deletion', async () => {
    // Arrange
    const campaign = { ...genCampaignDTO(), sentAt: undefined, returnCount: null };
    const { router } = renderView(campaign);
    await screen.findByRole('heading', { level: 1 });

    // Act
    await user.click(screen.getByRole('button', { name: /supprimer la campagne/i }));
    await screen.findByRole('dialog', { name: /supprimer la campagne/i });
    await user.click(screen.getByRole('button', { name: /annuler/i }));

    // Assert
    expect(router.state.location.pathname).toBe(`/campagnes/${campaign.id}`);
  });

  it('displays the sentAt date in dd/MM/yyyy format when set', async () => {
    // Arrange
    const campaign = { ...genCampaignDTO(), sentAt: '2024-03-15T00:00:00.000Z', returnCount: null };

    // Act
    renderView(campaign);

    // Assert
    expect(await screen.findByText('15/03/2024')).toBeInTheDocument();
  });

  it('renders the signatory upload sections in the Courrier tab', async () => {
    // Arrange
    const campaign = { ...genCampaignDTO(), sentAt: undefined, returnCount: null };
    const draft = genDraftDTO(genSenderDTO());
    data.drafts.push(draft);
    data.campaignDrafts.set(campaign.id, [{ id: draft.id }]);
    renderView(campaign);
    await screen.findByRole('heading', { level: 1 });

    // Act
    await user.click(screen.getByRole('tab', { name: /courrier/i }));

    // Assert
    expect(
      await screen.findByRole('heading', { name: 'Signature du premier expéditeur', level: 4 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Signature du second expéditeur', level: 4 })
    ).toBeInTheDocument();
  });
});
