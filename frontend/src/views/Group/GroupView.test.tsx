import { Store } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import fetchMock from 'jest-fetch-mock';
import { genCampaign, genGroup } from '../../../test/fixtures.test';
import { Route, Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import GroupView from './GroupView';
import configureTestStore from '../../store/store.test';
import { mockRequests } from '../../utils/test/requestUtils';

jest.mock('../../components/Aside/Aside.tsx');

describe('Group view', () => {
  const user = userEvent.setup();
  const group = genGroup();

  let store: Store;

  beforeEach(() => {
    fetchMock.resetMocks();
    store = configureTestStore();
  });

  describe('Create a campaign from the group', () => {
    it('should display a modal to create a campaign', async () => {
      const router = createMemoryHistory({
        initialEntries: [`/groupes/${group.id}`],
      });
      const campaign = genCampaign();
      const campaigns = [campaign];
      mockRequests([
        {
          pathname: `/api/groups/${group.id}`,
          response: {
            status: 200,
            body: JSON.stringify(group),
          },
        },
        {
          pathname: `/api/campaigns`,
          response: {
            status: 200,
            body: JSON.stringify(campaigns),
          },
        },
        {
          pathname: `/api/groups/${group.id}/campaigns`,
          method: 'POST',
          response: {
            status: 201,
            body: JSON.stringify(campaign),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router history={router}>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>
      );

      const createCampaign = await screen.findByText(/^Créer une campagne/);
      await user.click(createCampaign);
      const title = await screen.findByLabelText(/^Titre de la campagne/);
      await user.type(title, 'Logements prioritaires');
      const confirm = await screen.findByText('Confirmer');
      await user.click(confirm);

      expect(router.location).toMatchObject({
        pathname: `/campagnes/C${campaign.campaignNumber}/R${campaign.reminderNumber}`,
      });
    });
  });

  describe('Remove the group', () => {
    it('should display a modal to remove the group', async () => {
      const router = createMemoryHistory({
        initialEntries: [`/groupes/${group.id}`],
      });
      const campaign = genCampaign();
      const campaigns = [campaign];
      mockRequests([
        {
          pathname: `/api/groups/${group.id}`,
          response: {
            status: 200,
            body: JSON.stringify(group),
          },
        },
        {
          pathname: '/api/campaigns',
          response: {
            status: 200,
            body: JSON.stringify(campaigns),
          },
        },
        {
          pathname: `/api/groups/${group.id}`,
          response: {
            status: 204,
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router history={router}>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>
      );

      const removeGroup = await screen.findByText(/^Supprimer le groupe/);
      await user.click(removeGroup);
      const confirm = await screen.findByText(/^Confirmer/);
      await user.click(confirm);

      expect(router.location).toMatchObject({
        pathname: '/parc-de-logements',
      });
    });
  });
});
