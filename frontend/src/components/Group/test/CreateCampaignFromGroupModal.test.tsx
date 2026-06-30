import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { genGroup } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';

describe('CreateCampaignFromGroupModal', () => {
  it('should warn that do-not-contact owners are excluded from the campaign', () => {
    const modal = createCampaignFromGroupModal({ isOpenedByDefault: true });
    const store = configureTestStore({ withAuth: true });

    render(
      <Provider store={store}>
        <modal.Component group={genGroup()} onSubmit={() => undefined} />
      </Provider>
    );

    const alert = screen.getByText(
      /ne seront pas inclus comme destinataires de cette campagne/i
    );
    expect(alert).toBeInTheDocument();
  });
});
