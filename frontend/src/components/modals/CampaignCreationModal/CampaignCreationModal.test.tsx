import React from 'react';
import { render, screen } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';
import { Provider } from 'react-redux';
import { genAuthUser } from '../../../../test/fixtures.test';
import config from '../../../utils/config';
import fetchMock from 'jest-fetch-mock';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { applicationReducer } from '../../../store/store';

describe('Campagne creation modal', () => {
  const user = userEvent.setup();

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
    store = configureStore({
      reducer: applicationReducer,
      preloadedState: { authentication: { authUser: genAuthUser() } },
    });
  });

  test('should display housing count, campaign title input and submit button', () => {
    fetchMock.mockResponse(defaultFetchMock);

    render(
      <Provider store={store}>
        <CampaignCreationModal
          open={true}
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
          open={true}
          housingCount={2}
          filters={{}}
          onSubmit={() => {}}
          onClose={() => {}}
        />
      </Provider>
    );

    user.click(screen.getByTestId('create-button'));

    const error = await screen.findByText(
      'Veuillez renseigner le titre de la campagne.'
    );
    expect(error).toBeVisible();
  });
});
