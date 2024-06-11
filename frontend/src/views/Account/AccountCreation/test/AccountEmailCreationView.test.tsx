import { render, screen } from '@testing-library/react';
import { MemoryRouter as Router, Route } from 'react-router-dom';
import AccountEmailCreationView from '../AccountEmailCreationView';
import userEvent from '@testing-library/user-event';
import { store } from '../../../../store/store';
import { Provider } from 'react-redux';

describe('AccountEmailCreationView', () => {
  const user = userEvent.setup();

  function setup() {
    render(
      <Provider store={store}>
        <Router initialEntries={['/inscription/email']}>
          <Route
            path="/inscription/email"
            component={AccountEmailCreationView}
          />
          <Route path="/inscription/activation">Activation</Route>
          <Route exact path="/">
            Accueil
          </Route>
        </Router>
      </Provider>,
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
    await user.keyboard('{Enter}');

    const error = await screen.findByText(
      "L'adresse doit être un email valide",
    );
    expect(error).toBeVisible();
  });

  it('should redirect to /inscription/activation', async () => {
    setup();
    const email = 'ok@beta.gouv.fr';

    const input = screen.getByPlaceholderText('example@gmail.com');
    await user.type(input, email);
    await user.keyboard('{Enter}');

    const title = await screen.findByText('Activation');
    expect(title).toBeVisible();
  });
});
