import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';
import HousingListView from './HousingListView';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import { initialHousingFilters } from '../../store/reducers/housingReducer';
import {
  genAuthUser,
  genCampaign,
  genHousing,
  genPaginatedResult,
} from '../../../test/fixtures.test';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ownerKindOptions } from '../../models/HousingFilters';
import userEvent from '@testing-library/user-event';

jest.mock('../../components/Aside/Aside.tsx');

describe('housing view', () => {
  const user = userEvent.setup();

  function setup() {
    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <HousingListView />
        </Router>
      </Provider>
    );
  }

  let store: any;

  const defaultFetchMock = (request: Request) => {
    return Promise.resolve(
      request.url === `${config.apiEndpoint}/api/housing`
        ? {
            body: JSON.stringify(genPaginatedResult([])),
            init: { status: 200 },
          }
        : request.url === `${config.apiEndpoint}/api/campaigns`
        ? { body: JSON.stringify([]), init: { status: 200 } }
        : request.url === `${config.apiEndpoint}/api/geo/perimeters`
        ? { body: JSON.stringify([]), init: { status: 200 } }
        : request.url === `${config.apiEndpoint}/api/localities`
        ? { body: JSON.stringify([]), init: { status: 200 } }
        : { body: '', init: { status: 404 } }
    );
  };

  beforeEach(() => {
    fetchMock.resetMocks();
    store = createStore(
      applicationReducer,
      { authentication: { authUser: genAuthUser() } },
      applyMiddleware(thunk)
    );
  });

  test('should only show owner filters initially', async () => {
    fetchMock.mockResponse(defaultFetchMock);
    setup();

    const favoriteFilters = await screen.findByText(
      'Filtres les plus utilisés'
    );
    expect(favoriteFilters).toBeVisible();

    const allFilters = await screen.findByText('Tous les filtres');
    // Visibility: hidden does not work correctly in jest-dom
    expect(allFilters.clientWidth).toBe(0);
  });

  test('should enable to show and hide additional filters', async () => {
    fetchMock.mockResponse(defaultFetchMock);
    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <HousingListView />
        </Router>
      </Provider>
    );

    const seeAllFilters = await screen.findByText(/Voir tous les filtres/);
    await user.click(seeAllFilters);

    const additionalFilters = await screen.findByText('Tous les filtres');
    expect(additionalFilters).toBeVisible();
  });

  test('should filter', async () => {
    fetchMock.mockResponse(defaultFetchMock);

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <HousingListView />
        </Router>
      </Provider>
    );

    const ownerKindInput = await screen.findByLabelText('Type de propriétaire');
    await user.click(ownerKindInput);
    const ownerKindCheckboxes = await screen.findAllByLabelText(
      ownerKindOptions[0].label
    );
    await user.click(ownerKindCheckboxes[0]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${config.apiEndpoint}/api/housing`,
      {
        method: 'POST',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            ...initialHousingFilters,
            ownerKinds: [ownerKindOptions[0].value],
          },
          filtersForTotalCount: {
            dataYearsExcluded: [],
            dataYearsIncluded: [2022],
          },
          page: 1,
          perPage: config.perPageDefault,
        }),
        abortId: 'list-housing',
        signal: expect.anything(),
      }
    );
  });

  test('should search', async () => {
    const housing = genHousing();
    const campaign = genCampaign();
    const paginated = genPaginatedResult([housing]);

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        request.url === `${config.apiEndpoint}/api/housing`
          ? { body: JSON.stringify(paginated), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/campaigns`
          ? { body: JSON.stringify([campaign]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/geo/perimeters`
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/localities`
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : { body: '', init: { status: 404 } }
      );
    });

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <HousingListView />
        </Router>
      </Provider>
    );

    const searchInputElement = await screen.findByTestId('search-input');
    const searchButtonElement = await screen.findByTitle('Bouton de recherche');

    await user.type(searchInputElement, 'my search');
    await user.click(searchButtonElement);

    expect(fetchMock).toHaveBeenCalledWith(
      `${config.apiEndpoint}/api/housing`,
      {
        method: 'POST',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: { ...initialHousingFilters, query: 'my search' },
          filtersForTotalCount: {
            dataYearsExcluded: [],
            dataYearsIncluded: [2022],
          },
          page: 1,
          perPage: config.perPageDefault,
        }),
        abortId: 'list-housing',
        signal: expect.anything(),
      }
    );
  });

  test('should display an alert message on creating campaign if no housing are selected', async () => {
    const housing = genHousing();
    const campaign = genCampaign();
    const paginated = genPaginatedResult([housing]);

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        request.url === `${config.apiEndpoint}/api/housing`
          ? { body: JSON.stringify(paginated), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/campaigns`
          ? { body: JSON.stringify([campaign]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/geo/perimeters`
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/localities`
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : { body: '', init: { status: 404 } }
      );
    });

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <HousingListView />
        </Router>
      </Provider>
    );

    const createCampaignButton = await screen.findByTestId(
      'create-campaign-button'
    );

    await user.click(createCampaignButton);

    const noHousingAlert = screen.getByTestId('no-housing-alert');
    expect(noHousingAlert).toBeInTheDocument();
  });

  test('should enable the creation of the campaign when at least a housing is selected', async () => {
    const housing = genHousing();
    const campaign = genCampaign();
    const paginated = genPaginatedResult([housing]);

    fetchMock.mockResponse((request: Request) => {
      return Promise.resolve(
        request.url === `${config.apiEndpoint}/api/housing`
          ? { body: JSON.stringify(paginated), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/campaigns`
          ? { body: JSON.stringify([campaign]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/geo/perimeters`
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/localities`
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : { body: '', init: { status: 404 } }
      );
    });

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <HousingListView />
        </Router>
      </Provider>
    );

    const createCampaignButton = await screen.findByTestId(
      'create-campaign-button'
    );
    const housing1Element = await screen.findByTestId(
      'housing-check-' + housing.id
    );
    // eslint-disable-next-line testing-library/no-node-access
    const housing1CheckboxElement = housing1Element.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;

    await user.click(housing1CheckboxElement);
    await user.click(createCampaignButton);

    const campaignCreationModal = screen.getByTestId('campaign-creation-modal');

    expect(campaignCreationModal).toBeInTheDocument();
  });
});
