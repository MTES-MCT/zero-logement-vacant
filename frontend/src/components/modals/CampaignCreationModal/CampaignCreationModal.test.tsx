import React from 'react';
import { render, screen } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';
import { Provider } from 'react-redux';
import { genAuthUser } from '../../../../test/fixtures.test';
import config from '../../../utils/config';
import fetchMock from 'jest-fetch-mock';
import { configureStore } from '@reduxjs/toolkit';
import { applicationReducer } from '../../../store/store';

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

    expect(screen.getByText('Créer une campagne')).toBeVisible();

    // TODO How to open dsfr modal with Jest 🤔
    //
    // await user.click(screen.getByText('Ouvrir'));
    //
    // await user.click(screen.getByText('Enregistrer'));
    //
    // const error = await screen.findByText(
    //   'Veuillez renseigner le titre de la campagne.'
    // );
    // expect(error).toBeVisible();
  });
});
