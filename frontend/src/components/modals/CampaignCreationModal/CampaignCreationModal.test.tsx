import { render, screen, within } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';
import { Provider } from 'react-redux';
import { genAuthUser } from '../../../../test/fixtures.test';
import { configureStore } from '@reduxjs/toolkit';
import { applicationReducer } from '../../../store/store';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';

describe('Campagne creation modal', () => {
  const user = userEvent.setup();
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: applicationReducer,
      preloadedState: { authentication: { authUser: genAuthUser() } }
    });
  });

  test('should display housing count, campaign title input and submit button', () => {
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
    const campaignTitleInputElement = screen.getByLabelText(/^Titre de la campagne/);
    
    const createButton = screen.getByText('Enregistrer');
    expect(housingInfosTextElement).toBeInTheDocument();
    expect(housingInfosTextElement).toContainHTML(
      'Vous êtes sur le point de créer une campagne comportant <b>2 logements.</b>'
    );
    expect(campaignTitleInputElement).toBeInTheDocument();
    expect(createButton).toBeInTheDocument();
  });

  test('should require campaign title', async () => {
    render(
      <Provider store={store}>
        <CampaignCreationModal
          housingCount={2}
          filters={{}}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const createButton = screen.getByRole('button', { name: /^Créer une campagne/ });
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

  test('should restrict campaign title exceeding 64 characters in length', async () => {
    render(
      <Provider store={store}>
        <CampaignCreationModal
          housingCount={2}
          filters={{}}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const createButton = screen.getByRole('button', { name: /^Créer une campagne/ });
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const campaignTitleInputElement = screen.getByLabelText(/^Titre de la campagne/);
    await userEvent.type(campaignTitleInputElement, faker.lorem.words(50));

    const modal = screen.getByRole('dialog');
    const save = within(modal).getByText('Enregistrer');
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale du titre de la campagne est de 64 caractères.'
    );
    expect(error).toBeVisible();
  });

  test('should restrict campaign description exceeding 1000 characters in length', async () => {
    render(
      <Provider store={store}>
        <CampaignCreationModal
          housingCount={2}
          filters={{}}
          onSubmit={() => Promise.resolve()}
        />
      </Provider>
    );

    const createButton = screen.getByRole('button', { name: /^Créer une campagne/ });
    expect(createButton).toBeVisible();
    await user.click(createButton);

    const campaignTitleInputElement = screen.getByLabelText(/^Titre de la campagne/);

    await userEvent.type(campaignTitleInputElement, faker.lorem.words(3));

    const campaignDescriptionInputElement = screen.getByLabelText(/^Description de la campagne/);

    await userEvent.type(campaignDescriptionInputElement, faker.lorem.sentences(50));

    const modal = screen.getByRole('dialog');
    const save = within(modal).getByText('Enregistrer');
    await user.click(save);

    const error = await screen.findByText(
      'La longueur maximale de la description de la campagne est de 1000 caractères.'
    );
    expect(error).toBeVisible();
  });
});
