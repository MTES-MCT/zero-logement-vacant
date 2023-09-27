import React from 'react';
import { render, screen } from '@testing-library/react';
import AppHeader from './AppHeader';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { genAuthUser } from '../../../test/fixtures.test';
import { applicationReducer, store } from '../../store/store';
import { configureStore } from '@reduxjs/toolkit';
import ownerProspectService from '../../services/owner-prospect.service';
import { PaginatedResult } from '../../models/PaginatedResult';
import { OwnerProspect } from '../../models/OwnerProspect';

describe('AppHeader', () => {
  beforeEach(() => {
    const response: PaginatedResult<OwnerProspect> = {
      entities: [],
      page: 1,
      perPage: 25,
      loading: false,
      filteredCount: 0,
    };
    jest.spyOn(ownerProspectService, 'find').mockResolvedValue(response);
  });

  test('should not display navbar when no user is logged', () => {
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
