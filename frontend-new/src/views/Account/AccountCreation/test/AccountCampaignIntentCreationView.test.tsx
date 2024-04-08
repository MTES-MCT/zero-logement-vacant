import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import {
  genAuthUser,
  genProspect,
  genSiren,
  genUser,
} from '../../../../../test/fixtures.test';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import * as randomstring from 'randomstring';
import AccountCampaignIntentCreationView from '../AccountCampaignIntentCreationView';
import { Prospect } from '../../../../models/Prospect';
import authService from '../../../../services/auth.service';
import { configureStore } from '@reduxjs/toolkit';
import {
  applicationMiddlewares,
  applicationReducer,
} from '../../../../store/store';

describe('AccountCampaignIntentCreationView', () => {
  const user = userEvent.setup();
  const history = createMemoryHistory();
  const store = configureStore({
    reducer: applicationReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(applicationMiddlewares),
    preloadedState: { authentication: { authUser: genAuthUser() } },
  });
  const password = randomstring.generate();

  function setup(prospect: Prospect = genProspect()) {
    history.push({
      pathname: '/inscription/campagne',
      state: {
        prospect,
        password,
      },
    });
    render(
      <Provider store={store}>
        <Router history={history}>
          <AccountCampaignIntentCreationView />
        </Router>
      </Provider>
    );
  }

  function mockCreateUserPass() {
    return fetchMock.mockResponse(JSON.stringify(genUser()));
  }

  function mockLoginPass() {
    return jest.spyOn(authService, 'login').mockResolvedValue(genAuthUser());
  }

  it('should render', async () => {
    setup();

    await screen.findAllByText(
      'Quand prévoyez-vous de contacter des propriétaires de logements vacants ?'
    );
  });

  it('should go back to the previous step', async () => {
    setup();

    const previous = await screen.findByText('Revenir à l’étape précédente');
    await user.click(previous);

    expect(history.location.pathname).toBe('/inscription/mot-de-passe');
  });

  it('should disable campaign intent selection if one already exists', () => {
    setup({
      ...genProspect(),
      establishment: {
        id: randomstring.generate(),
        siren: genSiren(),
        campaignIntent: '2-4',
      },
    });

    const labels = [
      'Dans les 2 prochains mois',
      'Dans 2 à 4 mois',
      'Dans plus de 4 mois',
    ];
    labels
      .map((label) => screen.getByLabelText(label))
      .forEach((radio) => {
        expect(radio).toBeDisabled();
      });
  });

  it('should submit campaign intent if none exist', async () => {
    const createUser = mockCreateUserPass();
    const login = mockLoginPass();
    setup({
      ...genProspect(),
      establishment: {
        id: randomstring.generate(),
        siren: genSiren(),
      },
    });

    const radio = screen.getByLabelText('Dans les 2 prochains mois');
    await user.click(radio);

    expect(radio).toBeChecked();

    const submit = await screen.findByText('Créer votre compte');
    await user.click(submit);

    expect(createUser).toHaveBeenCalled();
    expect(login).toHaveBeenCalled();
  });
});
