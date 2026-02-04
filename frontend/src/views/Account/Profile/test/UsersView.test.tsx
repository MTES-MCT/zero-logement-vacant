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
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import data from '~/mocks/handlers/data';
import { fromUserDTO } from '~/models/User';
import configureTestStore from '~/utils/storeUtils';
import UsersView from '~/views/Account/Profile/UsersView';
import { genAuthUser } from '../../../../test/fixtures';
import { fromEstablishmentDTO } from '~/models/Establishment';

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

    const store = configureTestStore({
      auth: genAuthUser(
        fromUserDTO(options.auth),
        fromEstablishmentDTO(options.establishment)
      )
    });
    const router = createMemoryRouter(
      [{ path: '/utilisateurs', element: <UsersView /> }],
      {
        initialEntries: ['/utilisateurs']
      }
    );

    render(
      <Provider store={store}>
        <RouterProvider router={router} />
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

    await screen.findByText('Utilisateurs rattachés à votre structure');
    const remove = screen.queryByRole('button', {
      name: /Supprimer .*/
    });
    expect(remove).not.toBeInTheDocument();
  });
});
