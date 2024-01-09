import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import { Route, Router } from 'react-router-dom';

import configureTestStore from '../../utils/test/storeUtils';
import { mockRequests } from '../../utils/test/requestUtils';
import { genHousing, genOwner } from '../../../test/fixtures.test';
import HousingView from './HousingView';
import { Housing } from '../../models/Housing';
import { HousingOwner } from '../../models/Owner';

describe('Housing view', () => {
  function setup(housing: Housing) {
    const store = configureTestStore();
    const router = createMemoryHistory({
      initialEntries: [`/logements/${housing.id}`],
    });
    render(
      <Provider store={store}>
        <Router history={router}>
          <Route path="/logements/:housingId" component={HousingView} />
        </Router>
      </Provider>
    );
  }

  it('should set the document title', () => {
    const housing = genHousing();

    setup(housing);

    expect(document.title).toBe('Zéro Logement Vacant - Fiche logement');
  });

  describe('Owner', () => {
    const housing = genHousing();
    const owner = genOwner();
    const coowners = new Array(5).fill('0').map(() => genOwner());
    const owners: HousingOwner[] = [owner, ...coowners].map((owner, i) => ({
      ...owner,
      housingId: housing.id,
      rank: i + 1,
    }));

    beforeEach(() => {
      mockRequests([
        {
          pathname: `/api/housing/${housing.id}`,
          response: {
            body: JSON.stringify(housing),
          },
        },
        {
          pathname: `/api/housing/count`,
          response: {
            body: JSON.stringify({
              housing: 1,
              owners: 1,
            }),
          },
        },
        {
          pathname: `/api/owner/${owner.id}`,
          response: {
            body: JSON.stringify(owner),
          },
        },
        {
          pathname: `/api/owners/housing/${housing.id}`,
          response: {
            body: JSON.stringify(owners),
          },
        },
        {
          pathname: `/api/events/housing/${housing.id}`,
          response: {
            body: JSON.stringify([]),
          },
        },
        {
          pathname: `/api/notes/housing/${housing.id}`,
          response: {
            body: JSON.stringify([]),
          },
        },
        {
          pathname: '/api/campaigns',
          response: {
            body: JSON.stringify([]),
          },
        },
      ]);
    });

    it.todo('should display owner details');

    it("should display a button to view the owner's other housing", async () => {
      setup(housing);

      const button = await screen.findByText(/^Voir tous ses logements/);
      expect(button).toBeVisible();
    });

    it.todo('should display the co-owners');
  });

  describe('Housing', () => {
    it.todo('should display housing details');
  });
});
