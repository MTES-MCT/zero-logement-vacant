import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../../store/reducers/applicationReducers';
import thunk from 'redux-thunk';
import { genAuthUser } from '../../../../test/fixtures.test';
import config from '../../../utils/config';
import fetchMock from 'jest-fetch-mock';

describe('Campagne creation modal', () => {
  let store: any;

  const defaultFetchMock = (request: Request) => {
    return Promise.resolve(
      request.url === `${config.apiEndpoint}/api/campaigns`
        ? { body: JSON.stringify([]), init: { status: 200 } }
        : request.url === `${config.apiEndpoint}/api/geo/perimeters`
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

  test('should display housing count, campaign title input and submit button', () => {
    fetchMock.mockResponse(defaultFetchMock);

    render(
      <Provider store={store}>
        <CampaignCreationModal
          housingCount={2}
          filters={{}}
          onSubmit={() => {}}
          onClose={() => {}}
        />
      </Provider>
    );

    const housingInfosTextElement = screen.getByTestId('housing-infos');
    const campaignTitleInputElement = screen.getByTestId(
      'campaign-title-input'
    );
    const createButton = screen.getByTestId('create-button');
    expect(housingInfosTextElement).toBeInTheDocument();
    expect(housingInfosTextElement).toContainHTML(
      'Vous êtes sur le point de créer une campagne comportant <b>2 logements.</b>'
    );
    expect(campaignTitleInputElement).toBeInTheDocument();
    expect(createButton).toBeInTheDocument();
  });

  test('should require campaign title', async () => {
    fetchMock.mockResponse(defaultFetchMock);

    render(
      <Provider store={store}>
        <CampaignCreationModal
          housingCount={2}
          filters={{}}
          onSubmit={() => {}}
          onClose={() => {}}
        />
      </Provider>
    );

    fireEvent.click(screen.getByTestId('create-button'));

    const error = await screen.findByText(
      'Veuillez renseigner le titre de la campagne.'
    );
    expect(error).toBeVisible();
  });
});
