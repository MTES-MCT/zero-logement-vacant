import React from 'react';
import { render, screen, within } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { Provider } from 'react-redux';
import HousingListView from './HousingListView';
import config from '../../utils/config';
import { initialHousingFilters } from '../../store/reducers/housingReducer';
import {
  genCampaign,
  genDatafoncierHousing,
  genHousing,
  genPaginatedResult,
} from '../../../test/fixtures.test';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ownerKindOptions } from '../../models/HousingFilters';
import userEvent from '@testing-library/user-event';
import {
  getRequestCalls,
  mockRequests,
  RequestMatch,
} from '../../utils/test/requestUtils';
import { HousingStatus } from '../../models/HousingState';
import configureTestStore from '../../utils/test/storeUtils';
import { AppStore } from '../../store/store';
import * as randomstring from 'randomstring';

jest.mock('../../components/Aside/Aside.tsx');

describe('housing view', () => {
  const user = userEvent.setup();
  let store: AppStore;

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
        : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
        ? { body: JSON.stringify([]), init: { status: 200 } }
        : request.url === `${config.apiEndpoint}/api/housing/count`
        ? {
            body: JSON.stringify({ housing: 1, owners: 1 }),
            init: { status: 200 },
          }
        : { body: '', init: { status: 404 } }
    );
  };
  const defaultMatches: RequestMatch[] = [
    {
      pathname: '/api/housing',
      response: {
        body: JSON.stringify(genPaginatedResult([])),
      },
    },
    {
      pathname: '/api/campaigns',
      response: {
        body: JSON.stringify([]),
      },
    },
    {
      pathname: '/api/geo/perimeters',
      response: {
        body: JSON.stringify([]),
      },
    },
    {
      pathname: '/api/localities',
      response: {
        body: JSON.stringify([]),
      },
    },
    {
      pathname: '/api/housing/count',
      response: {
        body: JSON.stringify({ housing: 1, owners: 1 }),
      },
    },
  ];

  beforeEach(() => {
    store = configureTestStore();
  });

  test('should show filters side menu', async () => {
    fetchMock.mockResponse(defaultFetchMock);
    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <HousingListView />
        </Router>
      </Provider>
    );

    const seeFilters = await screen.findByTestId('filter-button');
    await user.click(seeFilters);

    const filters = await screen.findByText('Tous les filtres');
    expect(filters).toBeVisible();
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

    const seeFilters = await screen.findByTestId('filter-button');
    await user.click(seeFilters);

    const ownerFilters = await screen.findByTestId('ownerkind-filter');

    const ownerKindInput = await within(ownerFilters).findByText(/Type/);
    await user.click(ownerKindInput);

    const ownerKindCheckboxes = await screen.findAllByLabelText(
      ownerKindOptions[0].label
    );
    await user.click(ownerKindCheckboxes[0]);

    const requests = await getRequestCalls(fetchMock);

    [
      undefined,
      HousingStatus.NeverContacted,
      HousingStatus.Waiting,
      HousingStatus.FirstContact,
      HousingStatus.InProgress,
      HousingStatus.Completed,
      HousingStatus.Blocked,
    ].forEach((status) =>
      expect(requests).toContainEqual({
        url: `${config.apiEndpoint}/api/housing`,
        method: 'POST',
        body: {
          filters: {
            ...initialHousingFilters,
            status,
            ownerKinds: [ownerKindOptions[0].value],
          },
          page: 1,
          perPage: config.perPageDefault,
          paginate: true,
        },
      })
    );

    expect(requests).toContainEqual({
      url: `${config.apiEndpoint}/api/housing/count`,
      method: 'POST',
      body: {
        filters: {
          dataYearsExcluded: initialHousingFilters.dataYearsExcluded,
          dataYearsIncluded: initialHousingFilters.dataYearsIncluded,
          occupancies: initialHousingFilters.occupancies,
        },
      },
    });
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
          : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/housing/count`
          ? {
              body: JSON.stringify({ housing: 1, owners: 1 }),
              init: { status: 200 },
            }
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

    const requests = await getRequestCalls(fetchMock);

    [
      undefined,
      HousingStatus.NeverContacted,
      HousingStatus.Waiting,
      HousingStatus.FirstContact,
      HousingStatus.InProgress,
      HousingStatus.Completed,
      HousingStatus.Blocked,
    ].forEach((status) =>
      expect(requests).toContainEqual({
        url: `${config.apiEndpoint}/api/housing`,
        method: 'POST',
        body: {
          filters: { ...initialHousingFilters, query: 'my search', status },
          page: 1,
          perPage: config.perPageDefault,
          paginate: true,
        },
      })
    );
  });

  test('should not display the button to create campaign if no housing are selected', async () => {
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
          : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/housing/count`
          ? {
              body: JSON.stringify({ housing: 1, owners: 1 }),
              init: { status: 200 },
            }
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

    const createCampaignButton = screen.queryByTestId('create-campaign-button');

    expect(createCampaignButton).not.toBeInTheDocument();
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
          : request.url.startsWith(`${config.apiEndpoint}/api/localities`)
          ? { body: JSON.stringify([]), init: { status: 200 } }
          : request.url === `${config.apiEndpoint}/api/housing/count`
          ? {
              body: JSON.stringify({ housing: 1, owners: 1 }),
              init: { status: 200 },
            }
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

    const tabPanels = await screen.findAllByRole('tabpanel');

    const housing1Element = await within(tabPanels[0]).findByTestId(
      'housing-check-' + housing.id
    );
    // eslint-disable-next-line testing-library/no-node-access
    const housing1CheckboxElement = housing1Element.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;

    await user.click(housing1CheckboxElement);

    const createCampaignButton = await screen.findByTestId(
      'create-campaign-button'
    );
    expect(createCampaignButton).toBeInTheDocument();
  });

  describe('If the user does not know the local id', () => {
    test('should add a housing', async () => {
      const router = createMemoryHistory();
      const datafoncierHousing = genDatafoncierHousing();
      const housing = genHousing();
      mockRequests([
        ...defaultMatches,
        {
          pathname: `/api/datafoncier/housing/${datafoncierHousing.idlocal}`,
          response: { body: JSON.stringify(housing) },
        },
        {
          pathname: `/api/housing/${datafoncierHousing.idlocal}`,
          response: {
            status: 404,
            body: JSON.stringify({
              name: 'HousingMissingError',
              message: `Housing ${datafoncierHousing.idlocal} missing`,
            }),
          },
        },
        {
          pathname: '/api/housing/creation',
          response: {
            status: 201,
            body: JSON.stringify(housing),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router history={router}>
            <HousingListView />
          </Router>
        </Provider>
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button',
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        'Identifiant du logement'
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByText('Confirmer'));
      await within(modal).findByText(
        'Voici le logement que nous avons trouvé à cette adresse/sur cette parcelle.'
      );
      await user.click(within(modal).getByText('Confirmer'));

      expect(modal).not.toBeVisible();
      const alert = await screen.findByText(
        'Le logement sélectionné a bien été ajouté à Zéro Logement Vacant.'
      );
      expect(alert).toBeVisible();
    });

    test('should fail if the housing was not found in datafoncier', async () => {
      const localId = randomstring.generate(12);
      mockRequests([
        ...defaultMatches,
        // The housing is missing from datafoncier
        {
          pathname: `/api/datafoncier/housing/${localId}`,
          response: {
            status: 404,
            body: JSON.stringify({
              name: 'HousingMissingError',
              message: `Housing ${localId} missing`,
            }),
          },
        },
        {
          pathname: `/api/housing/${localId}`,
          response: {
            status: 404,
            body: JSON.stringify({
              name: 'HousingMissingError',
              message: `Housing ${localId} missing`,
            }),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router history={createMemoryHistory()}>
            <HousingListView />
          </Router>
        </Provider>
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button',
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        'Identifiant du logement'
      );
      await user.type(input, localId);
      await user.click(within(modal).getByText('Confirmer'));
      const alert = await within(modal).findByText(
        'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies.'
      );
      expect(alert).toBeVisible();
    });

    test('should fail if the housing already exists in our database', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const housing = genHousing();
      mockRequests([
        ...defaultMatches,
        {
          pathname: `/api/datafoncier/housing/${datafoncierHousing.idlocal}`,
          response: {
            status: 200,
            body: JSON.stringify(datafoncierHousing),
          },
        },
        // The housing exists in our database
        {
          pathname: `/api/housing/${datafoncierHousing.idlocal}`,
          response: {
            status: 200,
            body: JSON.stringify(housing),
          },
        },
      ]);

      render(
        <Provider store={store}>
          <Router history={createMemoryHistory()}>
            <HousingListView />
          </Router>
        </Provider>
      );

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button',
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        'Identifiant du logement'
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByText('Confirmer'));
      const alert = await within(modal).findByText(
        'Ce logement existe déjà dans votre parc.'
      );
      expect(alert).toBeVisible();
    });
  });
});
