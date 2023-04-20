import { render, screen } from '@testing-library/react';
import { Router } from 'react-router-dom';
import AccountEmailCreationView from '../AccountEmailCreationView';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { store } from '../../../../store/store';
import { Provider } from 'react-redux';

describe('AccountEmailCreationView', () => {
  const user = userEvent.setup();
  const history = createMemoryHistory();

  function setup() {
    render(
      <Provider store={store}>
        <Router history={history}>
          <AccountEmailCreationView />
        </Router>
      </Provider>
    );
  }

  it('should render', () => {
    setup();
    const title = screen.getByText('Créer votre compte');
    expect(title).toBeVisible();
  });

  it('should display an error if the email has a wrong format', async () => {
    setup();

    const input = screen.getByPlaceholderText('example@gmail.com');
    await user.type(input, 'invalid@email');

    const error = await screen.findByText(
      "L'adresse doit être un email valide"
    );
    expect(error).toBeVisible();
  });

  it('should redirect to /inscription/activation', async () => {
    setup();
    const email = 'ok@beta.gouv.fr';

    const input = screen.getByPlaceholderText('example@gmail.com');
    await user.type(input, email);
    await user.keyboard('{Enter}');

    expect(history.location.pathname).toBe('/inscription/activation');
    expect(history.location.state).toStrictEqual({ email });
  });
});
