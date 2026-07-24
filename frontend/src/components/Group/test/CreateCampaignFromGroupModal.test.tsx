import { render, screen, within } from '@testing-library/react';
import {
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { fromGroupDTO } from '~/models/Group';
import configureTestStore from '~/utils/storeUtils';

const modal = createCampaignFromGroupModal();
const creator = genUserDTO();
const group = fromGroupDTO(genGroupDTO(creator, [genHousingDTO()]));

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
    expect(within(dialog).queryByText(/propriétaire/)).not.toBeInTheDocument();
  });
});
