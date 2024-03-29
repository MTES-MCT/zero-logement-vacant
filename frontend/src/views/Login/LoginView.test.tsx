import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import LoginView from './LoginView';
import fetchMock from 'jest-fetch-mock';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { store } from '../../store/store';

describe('login view', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  test('should render login form', () => {
    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <LoginView />
        </Router>
      </Provider>
    );
    expect(screen.getAllByTestId('email-input')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('password-input')[0]).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  test('should display error message when login failed', async () => {
    fetchMock.mockResponseOnce('[]', { status: 401 });

    render(
      <Provider store={store}>
        <Router history={createMemoryHistory()}>
          <LoginView />
        </Router>
      </Provider>
    );

    const passwordInput = screen
      .getAllByTestId('password-input')[0]
      .querySelector('input'); //eslint-disable-line testing-library/no-node-access
    if (passwordInput) {
      await user.type(passwordInput, 'password');
    }
    const emailInput = screen
      .getAllByTestId('email-input')[0]
      .querySelector('input'); //eslint-disable-line testing-library/no-node-access
    if (emailInput) {
      await user.type(emailInput, 'email@test.com');
    }

    await user.click(screen.getByTestId('login-button'));

    await screen.findByTestId('alert-error');

    expect(fetchMock).toHaveBeenCalled();
    const errorElement = screen.getByTestId('alert-error');
    expect(errorElement).toBeInTheDocument();
  });

  test('should redirect when "forgotten password" is clicked', async () => {
    const history = createMemoryHistory();

    render(
      <Provider store={store}>
        <Router history={history}>
          <LoginView />
        </Router>
      </Provider>
    );

    const forgottenPassword = screen.getByText('Mot de passe perdu ?');
    await user.click(forgottenPassword);

    expect(history.location.pathname).toBe('/mot-de-passe/oublie');
  });

  test('should route to dashboard view when login succeeded', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        user: { email: 'email@test.com' },
        establishment: { id: 123 },
        accessToken: 'accessToken',
      }),
      { status: 200 }
    );

    const history = createMemoryHistory();
    render(
      <Provider store={store}>
        <Router history={history}>
          <LoginView />
        </Router>
      </Provider>
    );

    const passwordInput = screen
      .getAllByTestId('password-input')[0]
      .querySelector('input'); //eslint-disable-line testing-library/no-node-access
    if (passwordInput) {
      await user.type(passwordInput, 'password');
    }
    const emailInput = screen
      .getAllByTestId('email-input')[0]
      .querySelector('input'); //eslint-disable-line testing-library/no-node-access
    if (emailInput) {
      await user.type(emailInput, 'email@test.com');
    }

    await user.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
