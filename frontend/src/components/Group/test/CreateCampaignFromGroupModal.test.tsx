import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';

import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { genGroup } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';

const modal = createCampaignFromGroupModal();
const group = genGroup();

describe('CreateCampaignFromGroupModal', () => {
  function renderModal(stepper?: { currentStep: number; stepCount: number }) {
    render(
      <Provider store={configureTestStore()}>
        <modal.Component group={group} stepper={stepper} onSubmit={vi.fn()} />
      </Provider>
    );
    modal.open();
  }

  it('should not render a stepper by default', async () => {
    renderModal();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByText(/Étape \d sur \d/)
    ).not.toBeInTheDocument();
  });

  it('should render a stepper when the stepper prop is provided', async () => {
    renderModal({ currentStep: 2, stepCount: 2 });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Étape 2 sur 2')).toBeInTheDocument();
  });

  it('should disable the "Confirmer" button while submitting', async () => {
    render(
      <Provider store={configureTestStore()}>
        <modal.Component group={group} submitting onSubmit={vi.fn()} />
      </Provider>
    );
    modal.open();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Confirmer' })
    ).toBeDisabled();
  });

  it('should keep the "Confirmer" button enabled when not submitting', async () => {
    renderModal();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Confirmer' })
    ).toBeEnabled();
  });

  it('should render without crashing when no group is provided', async () => {
    render(
      <Provider store={configureTestStore()}>
        <modal.Component
          group={null}
          stepper={{ currentStep: 2, stepCount: 2 }}
          onSubmit={vi.fn()}
        />
      </Provider>
    );
    modal.open();

    const dialog = await screen.findByRole('dialog');
    // The modal shell still renders; the group-dependent housing/owner counts
    // are omitted. This guards the always-mounted usage in SaveCampaignFlow,
    // where the step-2 modal is rendered with a null group until one is picked.
    expect(within(dialog).getByText('Étape 2 sur 2')).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/\d+ propriétaires?/)
    ).not.toBeInTheDocument();
  });

  it('should warn that do-not-contact owners are excluded from the campaign', async () => {
    renderModal();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        /ne seront pas inclus comme destinataires de cette campagne/i
      )
    ).toBeInTheDocument();
  });
});
