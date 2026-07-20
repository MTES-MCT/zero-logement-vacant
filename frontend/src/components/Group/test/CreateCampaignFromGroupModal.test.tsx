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
});
