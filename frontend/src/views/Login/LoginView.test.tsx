import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { genUserDTO } from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import type { AuthContextValue } from '~/contexts/AuthContext';
import { genAuthContextValue, MockAuthProvider } from '~/test/auth';

import configureTestStore from '../../utils/storeUtils';
import LoginView from './LoginView';

describe('login view', () => {
  const user = userEvent.setup();

  function setup(options?: { auth?: AuthContextValue; initialEntry?: string }) {
    const store = configureTestStore();
    const router = createMemoryRouter(
      [
        { path: '/connexion', element: <LoginView /> },
        { path: '/admin', element: <LoginView /> },
        {
          path: '/mot-de-passe/oublie',
          element: 'Mot de passe oublié'
        },
        {
          path: '/parc-de-logements',
          element: 'Parc de logements'
        },
        {
          path: '/verification-2fa',
          element: 'Vérification en deux étapes'
        }
      ],
      { initialEntries: [options?.initialEntry ?? '/connexion'] }
    );
    const view = (
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
    render(
      <MockAuthProvider value={options?.auth ?? genAuthContextValue()}>
        {view}
      </MockAuthProvider>
    );
  }

  it('should render login form', () => {
    setup();

    const email = screen.queryByLabelText(/^Adresse e-mail/);
    expect(email).toBeVisible();
    const password = screen.queryByLabelText(/^Mot de passe/);
    expect(password).toBeVisible();
    const logIn = screen.queryByRole('button', { name: /^Se connecter/ });
    expect(logIn).toBeVisible();
  });

  it('should display error message when login failed', async () => {
    const signIn = vi.fn(async () => {
      throw new Error('Échec de l’authentification.');
    });
    setup({
      auth: {
        ...genAuthContextValue(),
        signIn
      }
    });

    const email = screen.getByLabelText(/^Adresse e-mail/);
    await user.type(email, 'test@test.test');
    const password = screen.getByLabelText(/^Mot de passe/);
    await user.type(password, 'wrong-password');
    const logIn = screen.getByRole('button', { name: /^Se connecter/ });
    await user.click(logIn);

    const alert = await screen.findByText(/^Échec de l’authentification/);
    expect(alert).toBeVisible();
  });

  it('should redirect when "forgotten password" is clicked', async () => {
    setup();

    const forgottenPassword = screen.getByText('Mot de passe perdu ?');
    await user.click(forgottenPassword);

    const page = await screen.findByText('Mot de passe oublié');
    expect(page).toBeVisible();
  });

  it('should succeed to log in', async () => {
    const currentUser = genUserDTO();
    const signIn = vi.fn(async () => {});

    setup({
      auth: {
        ...genAuthContextValue(),
        signIn
      }
    });

    const email = screen.getByLabelText(/^Adresse e-mail/);
    await user.type(email, currentUser.email);
    const password = screen.getByLabelText(/^Mot de passe/);
    await user.type(password, 'password'); // Whatever you want

    const logIn = screen.getByRole('button', { name: /^Se connecter/ });
    await user.click(logIn);

    expect(signIn).toHaveBeenCalledWith(currentUser.email, 'password');
    const alert = screen.queryByText(/^Échec de l'authentification/);
    expect(alert).not.toBeInTheDocument();
  });

  it('prevents duplicate login submissions while pending', async () => {
    const signIn = vi.fn(() => new Promise<void>(() => {}));
    setup({
      auth: {
        ...genAuthContextValue(),
        signIn
      }
    });

    await user.type(screen.getByLabelText(/^Adresse e-mail/), 'agent@zlv.fr');
    await user.type(
      screen.getByLabelText(/^Mot de passe/),
      'not-a-real-password'
    );

    const logIn = screen.getByRole('button', { name: /^Se connecter/ });
    await user.dblClick(logIn);

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Connexion en cours/)).toBeInTheDocument();
  });

  it('should mark required fields as invalid and associate the error to the field when submitted empty (RGAA 11.10)', async () => {
    setup();

    const logIn = screen.getByRole('button', { name: /^Se connecter/ });
    await user.click(logIn);

    const email = await screen.findByLabelText(/^Adresse e-mail/);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-required', 'true');
    expect(email).toHaveAccessibleDescription(
      'Veuillez renseigner votre adresse email.'
    );

    const password = screen.getByLabelText(/^Mot de passe/);
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-required', 'true');
    expect(password).toHaveAccessibleDescription(
      'Veuillez renseigner un mot de passe.'
    );
  });

  it('should clear the invalid state once a valid value is entered', async () => {
    setup();

    const logIn = screen.getByRole('button', { name: /^Se connecter/ });
    await user.click(logIn);

    const email = await screen.findByLabelText(/^Adresse e-mail/);
    expect(email).toHaveAttribute('aria-invalid', 'true');

    await user.type(email, 'test@test.test');
    await user.click(logIn);

    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('should associate the establishment error to the field when an admin submits without selecting one (RGAA 11.10)', async () => {
    setup({ initialEntry: '/admin' });

    const email = screen.getByLabelText(/^Adresse e-mail/);
    await user.type(email, 'admin@zlv.fr');
    const password = screen.getByLabelText(/^Mot de passe/);
    await user.type(password, 'password');

    const logIn = screen.getByRole('button', { name: /^Se connecter/ });
    await user.click(logIn);

    const establishment = await screen.findByLabelText(
      /^Collectivité \(obligatoire\)/
    );
    expect(establishment).toHaveAccessibleDescription(
      'Veuillez sélectionner un établissement.'
    );
    expect(establishment).toHaveAttribute('aria-invalid', 'true');
  });
});
