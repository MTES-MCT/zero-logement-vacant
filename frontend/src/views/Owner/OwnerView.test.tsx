import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import OwnerView from './OwnerView';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import {
  genCampaign,
  genHousing,
  genOwner,
  genPaginatedResult,
} from '../../../test/fixtures.test';
import { format } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';

describe('housing view', () => {
  let store: any;

  beforeEach(() => {
    fetchMock.resetMocks();
    store = createStore(applicationReducer, applyMiddleware(thunk));
  });

  test('should display owner infos', async () => {
    const owner = genOwner();
    const housing1 = genHousing();
    const housing2 = genHousing();

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        (() => {
          if (request.url === `${config.apiEndpoint}/api/owners/${owner.id}`) {
            return {
              body: JSON.stringify({
                ...owner,
                birthDate: owner.birthDate
                  ? format(owner.birthDate, 'yyyy-MM-dd')
                  : undefined,
              }),
              init: { status: 200 },
            };
          } else if (
            request.url ===
            `${config.apiEndpoint}/api/housing/owner/${owner.id}`
          ) {
            return {
              body: JSON.stringify(genPaginatedResult([housing1, housing2])),
              init: { status: 200 },
            };
          } else if (
            request.url === `${config.apiEndpoint}/api/events/owner/${owner.id}`
          ) {
            return {
              body: JSON.stringify([]),
              init: { status: 200 },
            };
          } else if (request.url === `${config.apiEndpoint}/api/campaigns`) {
            return {
              body: JSON.stringify([genCampaign()]),
              init: { status: 200 },
            };
          } else return { body: '', init: { status: 404 } };
        })()
      );
    });

    const history = createMemoryHistory({
      initialEntries: [`/proprietaires/${owner.id}`],
    });

    render(
      <Provider store={store}>
        <Router history={history}>
          <Route exact path="/proprietaires/:ownerId" component={OwnerView} />
        </Router>
      </Provider>
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${config.apiEndpoint}/api/owners/${owner.id}`,
      {
        method: 'GET',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${config.apiEndpoint}/api/housing/owner/${owner.id}`,
      {
        method: 'GET',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
      }
    );

    await waitFor(async () => {
      await screen.findByText(capitalize(owner.fullName));
    });
    if (owner.birthDate) {
      await screen.findByText(
        `né(e) le ${format(owner.birthDate, 'dd/MM/yyyy')}`
      );
    }
    if (owner.email) {
      await screen.findByText(owner.email);
    }
    if (owner.phone) {
      await screen.findByText(owner.phone);
    }

    expect(fetchMock).toHaveBeenCalledWith(
      `${config.apiEndpoint}/api/owners/${owner.id}`,
      {
        method: 'GET',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
      }
    );
  });
});
