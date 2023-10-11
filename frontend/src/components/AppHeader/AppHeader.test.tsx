import React from 'react';
import { render, screen } from '@testing-library/react';
import AppHeader from './AppHeader';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { genAuthUser } from '../../../test/fixtures.test';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { configureStore } from '@reduxjs/toolkit';

describe('AppHeader', () => {
  test('should not display navbar when no user is logged', () => {
    const store = configureStore({
      reducer: applicationReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }).concat(applicationMiddlewares),
      preloadedState: { authentication: { authUser: undefined } },
    });

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <AppHeader />
        </Router>
      </Provider>
    );

    const loginInputElement = screen.queryByTestId('header-nav');
    expect(loginInputElement).not.toBeInTheDocument();
  });

  test('should display navbar when a user is logged', () => {
    const store = configureStore({
      reducer: applicationReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }).concat(applicationMiddlewares),
      preloadedState: { authentication: { authUser: genAuthUser() } },
    });

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <AppHeader />
        </Router>
      </Provider>
    );

    const loginInputElement = screen.queryByTestId('header-nav');
    expect(loginInputElement).toBeInTheDocument();
  });
});
