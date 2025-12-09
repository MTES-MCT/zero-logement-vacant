import { render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import AccountEmailCreationView from '../AccountEmailCreationView';
import userEvent from '@testing-library/user-event';
import { store } from '../../../../store/store';
import { Provider } from 'react-redux';

describe('AccountEmailCreationView', () => {
  const user = userEvent.setup();

  function setup() {
    const router = createMemoryRouter(
      [
        {
          path: '/inscription/*',
          element: <Outlet />,
          children: [
            { path: 'email', element: <AccountEmailCreationView /> },
            { path: 'activation', element: 'Activation' }
          ]
        }
      ],
      { initialEntries: ['/inscription/email'] }
    );
    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  it('should render', () => {
    setup();

    const title = screen.getByText('Créez votre compte');
    expect(title).toBeVisible();
  });

  it('should display an error if the email has a wrong format', async () => {
    setup();

    const input = screen.getByLabelText(/^Adresse e-mail/i);
    await user.type(input, 'invalid-email');
    await user.keyboard('{Enter}');

    const error = await screen.findByText(
      /L'adresse doit être un email valide/
    );
    expect(error).toBeVisible();
  });

  it('should go back to the home website', async () => {
    setup();

    const home = screen.getByRole('link', {
      name: /Retour à la page d’accueil/i
    });
    await user.click(home);
  });

  it('should go on to /inscription/activation', async () => {
    setup();

    const email = 'ok@beta.gouv.fr';
    const input = screen.getByLabelText(/^Adresse e-mail/i);
    await user.type(input, email);
    await user.keyboard('{Enter}');

    const title = await screen.findByText('Activation');
    expect(title).toBeVisible();
  });
});
