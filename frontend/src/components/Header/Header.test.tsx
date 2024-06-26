import { render, screen } from '@testing-library/react';
import Header from './Header';
import { MemoryRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { configureStore } from '@reduxjs/toolkit';
import { genAuthUser } from '../../../test/fixtures.test';

describe('AppHeader', () => {
  test('should not display navbar when no user is logged', () => {
    const store = configureStore({
      reducer: applicationReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false
        }).concat(applicationMiddlewares),
      preloadedState: { authentication: { authUser: undefined } }
    });

    render(
      <Provider store={store}>
        <Router>
          <Header />
        </Router>
      </Provider>
    );

    const housingNavItem = screen.queryByTestId(
      'fr-header-nav-item-parc-de-logements'
    );
    const campaignNavItem = screen.queryByTestId(
      'fr-header-nav-item-campagnes'
    );
    const infosNavItem = screen.queryByTestId(
      'fr-header-nav-item-informations-publiques'
    );
    expect(housingNavItem).not.toBeInTheDocument();
    expect(campaignNavItem).not.toBeInTheDocument();
    expect(infosNavItem).not.toBeInTheDocument();
  });

  test('should display navbar when a user is logged', () => {
    const store = configureStore({
      reducer: applicationReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false
        }).concat(applicationMiddlewares),
      preloadedState: { authentication: { authUser: genAuthUser() } }
    });

    render(
      <Provider store={store}>
        <Router>
          <Header />
        </Router>
      </Provider>
    );

    const housingNavItem = screen.queryByTestId(
      'fr-header-nav-item-parc-de-logements'
    );
    const campaignNavItem = screen.queryByTestId(
      'fr-header-nav-item-campagnes'
    );
    const resourcesNavItem = screen.queryByTestId(
      'fr-header-nav-item-ressources'
    );
    expect(housingNavItem).toBeInTheDocument();
    expect(campaignNavItem).toBeInTheDocument();
    expect(resourcesNavItem).toBeInTheDocument();
  });
});
