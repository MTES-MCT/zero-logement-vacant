import { Store } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import fetchMock from 'jest-fetch-mock';
import { genCampaign, genGroup } from '../../../test/fixtures.test';
import { Route, Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import GroupView from './GroupView';
import configureTestStore from '../../utils/test/storeUtils';

import { mockRequests } from '../../utils/test/requestUtils';

describe('Group view', () => {
  const user = userEvent.setup();
  const group = genGroup();

  let store: Store;

  beforeEach(() => {
    fetchMock.resetMocks();
    store = configureTestStore();
  });

  it('should redirect to the housing list view if the group has been archived', async () => {
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
          body: JSON.stringify({
            ...group,
            archivedAt: new Date().toJSON(),
          }),
        },
      },
      {
        pathname: `/api/campaigns?groups=${group.id}`,
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

    await waitFor(() => {
      expect(router.location).toMatchObject({
        pathname: '/parc-de-logements',
      });
    });
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
          pathname: `/api/campaigns?groups=${group.id}`,
          response: {
            status: 200,
            body: JSON.stringify(campaigns),
          },
        },
        {
          pathname: `/api/campaigns/${group.id}/groups`,
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
      const modal = await screen.findByRole('dialog');
      const title = await within(modal).findByLabelText(
        /^Titre de la campagne/
      );
      await user.type(title, 'Logements prioritaires');
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);

      expect(router.location).toMatchObject({
        pathname: `/campagnes/${campaign.id}`,
      });
    });
  });

  describe('Remove the group', () => {
    it('should display a modal to archive the group', async () => {
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
          pathname: `/api/campaigns?groups=${group.id}`,
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

      const archiveGroup = await screen.findByText(/^Archiver le groupe/);
      await user.click(archiveGroup);
      const modal = await screen.findByRole('dialog');
      const confirm = await within(modal).findByText(/^Confirmer/);
      await user.click(confirm);

      expect(router.location).toMatchObject({
        pathname: '/parc-de-logements',
      });
    });

    it('should display a "Remove" button if no campaign was created from the group', async () => {
      const router = createMemoryHistory({
        initialEntries: [`/groupes/${group.id}`],
      });
      mockRequests([
        {
          pathname: `/api/groups/${group.id}`,
          response: {
            status: 200,
            body: JSON.stringify(group),
          },
        },
        {
          pathname: `/api/campaigns?groups=${group.id}`,
          response: {
            status: 200,
            body: JSON.stringify([]),
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
      expect(removeGroup).toBeVisible();
    });
  });
});
