import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter as Router, Route } from 'react-router-dom';

import { genUserDTO } from '@zerologementvacant/models';
import { store } from '../../store/store';
import LoginView from './LoginView';
import data from '../../mocks/handlers/data';

describe('login view', () => {
  const user = userEvent.setup();

  it('should render login form', () => {
    render(
      <Provider store={store}>
        <Router>
          <LoginView />
        </Router>
      </Provider>
    );

    const email = screen.queryByLabelText(/^Adresse email/);
    expect(email).toBeVisible();
    const password = screen.queryByLabelText(/^Mot de passe/);
    expect(password).toBeVisible();
    const logIn = screen.queryByRole('button', { name: /^Se connecter/, });
    expect(logIn).toBeVisible();
  });

  it('should display error message when login failed', async () => {
    const currentUser = genUserDTO();
    expect(data.users).toSatisfyAll((user) => user.email !== currentUser.email);

    render(
      <Provider store={store}>
        <Router>
          <LoginView />
        </Router>
      </Provider>
    );

    const email = screen.getByLabelText(/^Adresse email/);
    await user.type(email, 'test@test.test');
    const password = screen.getByLabelText(/^Mot de passe/);
    await user.type(password, faker.string.alphanumeric(16));
    const logIn = screen.getByRole('button', { name: /^Se connecter/, });
    await user.click(logIn);

    const alert = await screen.findByText(/^Échec de l'authentification/);
    expect(alert).toBeVisible();
  });

  it('should redirect when "forgotten password" is clicked', async () => {
    render(
      <Provider store={store}>
        <Router initialEntries={['/connexion']}>
          <Route path="/connexion" component={LoginView} />
          <Route path="/mot-de-passe/oublie">Mot de passe oublié</Route>
        </Router>
      </Provider>
    );

    const forgottenPassword = screen.getByText('Mot de passe perdu ?');
    await user.click(forgottenPassword);

    const page = await screen.findByText('Mot de passe oublié');
    expect(page).toBeVisible();
  });

  it('should succeed to log in', async () => {
    const currentUser = genUserDTO();
    data.users.push(currentUser);

    render(
      <Provider store={store}>
        <Router initialEntries={['/connexion']}>
          <LoginView />
        </Router>
      </Provider>
    );

    const email = screen.getByLabelText(/^Adresse email/);
    await user.type(email, currentUser.email);
    const password = screen.getByLabelText(/^Mot de passe/);
    await user.type(password, 'password'); // Whatever you want

    const logIn = screen.getByRole('button', { name: /^Se connecter/, });
    await user.click(logIn);

    const alert = screen.queryByText(/^Échec de l'authentification/);
    expect(alert).not.toBeInTheDocument();
  });
});
