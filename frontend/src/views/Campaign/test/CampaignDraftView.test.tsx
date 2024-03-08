import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, History } from 'history';
import { Provider } from 'react-redux';

import { genCampaign } from '../../../../test/fixtures.test';
import configureTestStore from '../../../utils/test/storeUtils';
import { AppStore } from '../../../store/store';
import { mockRequests } from '../../../utils/test/requestUtils';
import { Route, Router } from 'react-router-dom';
import CampaignDraftView from '../CampaignDraftView';

describe('Campaign draft view', () => {
  const user = userEvent.setup();
  const campaign = genCampaign();

  let store: AppStore;
  let router: History;

  beforeEach(() => {
    store = configureTestStore();
    router = createMemoryHistory({
      initialEntries: [`/campagnes/${campaign.id}/brouillon`],
    });
  });

  function renderComponent(): void {
    render(
      <Provider store={store}>
        <Router history={router}>
          <Route
            path="/campaigns/:id/brouillon"
            component={CampaignDraftView}
          />
        </Router>
      </Provider>
    );
  }

  describe('The campaign does not exist', () => {
    beforeEach(() => {
      mockRequests([
        {
          pathname: `/api/campaigns/${campaign.id}`,
          response: {
            status: 404,
          },
        },
      ]);
    });

    it('should display a 404 page', async () => {
      renderComponent();

      expect(router.location).toMatchObject({
        pathname: '/404',
      });
    });
  });
});
