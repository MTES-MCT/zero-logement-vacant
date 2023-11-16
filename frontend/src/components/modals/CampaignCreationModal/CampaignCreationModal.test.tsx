import React from 'react';
import { render, screen, within } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';
import { Provider } from 'react-redux';
import { genAuthUser } from '../../../../test/fixtures.test';
import config from '../../../utils/config';
import fetchMock from 'jest-fetch-mock';
import { configureStore } from '@reduxjs/toolkit';
import { applicationReducer } from '../../../store/store';
import userEvent from '@testing-library/user-event';

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
          housingCount={2}
          filters={{}}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const housingInfosTextElement = screen.getByTestId('housing-infos');
    const campaignTitleInputElement = screen.getAllByTestId(
      'campaign-title-input'
    )[0];
    const createButton = screen.getByText('Enregistrer');
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
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const createButton = screen.getByText('Créer une campagne');
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const modal = screen.getByRole('dialog');
    const save = within(modal).getByText('Enregistrer');
    await user.click(save);

    const error = await screen.findByText(
      'Veuillez renseigner le titre de la campagne.'
    );
    expect(error).toBeVisible();
  });
});
