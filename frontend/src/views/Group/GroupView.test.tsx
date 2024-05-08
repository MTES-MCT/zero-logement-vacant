import { Store } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import fetchMock from 'jest-fetch-mock';
import { genCampaign, genGroup } from '../../../test/fixtures.test';
import { MemoryRouter as Router, Route } from 'react-router-dom';
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

  it('should show NotFoundView if the group has been archived', async () => {
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
        <Router initialEntries={[`/groupes/${group.id}`]}>
          <Route path="/parc-de-logements">Parc de logements</Route>
          <Route path="/groupes/:id" component={GroupView} />
        </Router>
      </Provider>,
    );

    const text = await screen.findByText('Page non trouvée');
    expect(text).toBeVisible();
  });

  describe('Create a campaign from the group', () => {
    it('should display a modal to create a campaign', async () => {
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
          <Router initialEntries={[`/groupes/${group.id}`]}>
            <Route path="/campagnes/:id">Campagne</Route>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>,
      );

      const createCampaign = await screen.findByText(/^Créer une campagne/);
      await user.click(createCampaign);
      const modal = await screen.findByRole('dialog');
      const title = await within(modal).findByLabelText(
        /^Titre de la campagne/,
      );
      await user.type(title, 'Logements prioritaires');
      const confirm = await within(modal).findByText('Confirmer');
      await user.click(confirm);

      const page = await screen.findByText('Campagne');
      expect(page).toBeVisible();
    });
  });

  describe('Remove the group', () => {
    it('should display a modal to archive the group', async () => {
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
          <Router initialEntries={[`/groupes/${group.id}`]}>
            <Route path="/parc-de-logements">Parc de logements</Route>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>,
      );

      const archiveGroup = await screen.findByText(/^Archiver le groupe/);
      await user.click(archiveGroup);
      const modal = await screen.findByRole('dialog');
      const confirm = await within(modal).findByText(/^Confirmer/);
      await user.click(confirm);

      const page = await screen.findByText('Parc de logements');
      expect(page).toBeVisible();
    });

    it('should display a "Remove" button if no campaign was created from the group', async () => {
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
          <Router initialEntries={[`/groupes/${group.id}`]}>
            <Route path="/groupes/:id" component={GroupView} />
          </Router>
        </Provider>,
      );

      const removeGroup = await screen.findByText(/^Supprimer le groupe/);
      expect(removeGroup).toBeVisible();
    });
  });
});
