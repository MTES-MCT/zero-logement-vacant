import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UserRole,
  type EstablishmentDTO,
  type UserDTO
} from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import data from '~/mocks/handlers/data';
import { MockAuthProvider } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';
import UsersView from '~/views/Account/Profile/UsersView';

describe('Users view', () => {
  interface RenderViewOptions {
    auth: UserDTO;
    establishment: EstablishmentDTO;
    users: ReadonlyArray<UserDTO>;
  }

  function renderView(options: RenderViewOptions) {
    data.establishments.push(options.establishment);
    data.users.push(options.auth);
    data.users.push(...options.users);

    const store = configureTestStore();
    const router = createMemoryRouter(
      [{ path: '/utilisateurs', element: <UsersView /> }],
      {
        initialEntries: ['/utilisateurs']
      }
    );

    render(
      <Provider store={store}>
        <MockAuthProvider
          options={{ user: options.auth, establishment: options.establishment }}
        >
          <RouterProvider router={router} />
        </MockAuthProvider>
      </Provider>
    );
  }

  const user = userEvent.setup();

  it('should remove a user', async () => {
    const auth = genUserDTO(UserRole.ADMIN);
    const establishment = genEstablishmentDTO();
    const users: ReadonlyArray<UserDTO> = faker.helpers.multiple(() =>
      genUserDTO(UserRole.USUAL, establishment)
    );

    renderView({
      auth,
      establishment,
      users
    });

    const someone = faker.helpers.arrayElement(users);
    const remove = await screen.findByRole('button', {
      name: `Supprimer ${someone.firstName} ${someone.lastName}`
    });
    await user.click(remove);
    const dialog = await screen.findByRole('dialog', {
      name: 'Supprimer l’utilisateur'
    });
    const confirm = await within(dialog).findByRole('button', {
      name: 'Confirmer'
    });
    await user.click(confirm);
  });

  it.each([
    { name: 'usual users', role: UserRole.USUAL },
    { name: 'visitors', role: UserRole.VISITOR }
  ])('should hide the delete button for $name', async ({ role }) => {
    const auth = genUserDTO(role);
    const establishment = genEstablishmentDTO();
    const users: ReadonlyArray<UserDTO> = faker.helpers.multiple(() =>
      genUserDTO(UserRole.USUAL, establishment)
    );

    renderView({
      auth,
      establishment,
      users
    });

    await screen.findByRole('table');
    const remove = screen.queryByRole('button', {
      name: /Supprimer .*/
    });
    expect(remove).not.toBeInTheDocument();
  });

  it('associates the users table with a <caption> title (RGAA 5.4)', async () => {
    const auth = genUserDTO(UserRole.ADMIN);
    const establishment = genEstablishmentDTO();
    const users: ReadonlyArray<UserDTO> = faker.helpers.multiple(() =>
      genUserDTO(UserRole.USUAL, establishment)
    );

    renderView({
      auth,
      establishment,
      users
    });

    const table = await screen.findByRole('table', {
      name: 'Utilisateurs rattachés à votre structure'
    });
    const caption = table.querySelector('caption');
    expect(caption).not.toBeNull();
    expect(caption).toHaveTextContent(
      'Utilisateurs rattachés à votre structure'
    );
  });
});
