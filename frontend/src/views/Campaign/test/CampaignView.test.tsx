import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, History } from 'history';
import { Provider } from 'react-redux';
import { Route, Router } from 'react-router-dom';

import { genCampaign, genDraft } from '../../../../test/fixtures.test';
import configureTestStore from '../../../utils/test/storeUtils';
import { AppStore } from '../../../store/store';
import { mockRequests } from '../../../utils/test/requestUtils';
import CampaignView from '../CampaignView';
import { Draft } from '../../../models/Draft';
import Notification from '../../../components/Notification/Notification';

describe('Campaign view', () => {
  const user = userEvent.setup();

  const campaign = genCampaign();
  const draft = genDraft();

  let store: AppStore;
  let router: History;

  beforeEach(() => {
    store = configureTestStore();
    router = createMemoryHistory({
      initialEntries: [`/campagnes/${campaign.id}`],
    });
  });

  function renderComponent(): void {
    render(
      <Provider store={store}>
        <Notification />
        <Router history={router}>
          <Route path="/campagnes/:id" component={CampaignView} />
        </Router>
      </Provider>
    );
  }

  it('should display "Page non trouvée" if the campaign does not exist', async () => {
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          status: 404,
          body: JSON.stringify({
            name: 'CampaignMissingError',
            message: `Campaign ${campaign.id} missing`,
          }),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
    ]);

    renderComponent();

    await screen.findByText('Page non trouvée');
  });

  it('should render', async () => {
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          body: JSON.stringify(campaign),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([draft]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
    ]);

    renderComponent();

    const title = await screen.findByText(campaign.title);
    expect(title).toBeVisible();
  });

  it('should save the draft on button click', async () => {
    const updated: Draft = { ...draft, body: 'Updated body' };
    mockRequests([
      {
        pathname: `/api/campaigns/${campaign.id}`,
        response: {
          body: JSON.stringify(campaign),
        },
      },
      {
        pathname: `/api/drafts?campaign=${campaign.id}`,
        response: {
          body: JSON.stringify([draft]),
        },
      },
      {
        pathname: '/api/housing/count',
        method: 'POST',
        response: {
          body: JSON.stringify({
            housing: 1,
            owners: 1,
          }),
        },
      },
      {
        pathname: `/api/drafts/${draft.id}`,
        method: 'PUT',
        response: {
          body: JSON.stringify(updated),
        },
      },
    ]);

    renderComponent();

    const save = await screen.findByRole('button', { name: /^Sauvegarder/ });
    await user.click(save);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^Sauvegarde.../);
  });
});
