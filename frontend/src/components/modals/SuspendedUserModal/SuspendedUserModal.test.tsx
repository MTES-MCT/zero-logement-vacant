import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { genUserDTO, genEstablishmentDTO } from '@zerologementvacant/models/fixtures';
import SuspendedUserModal from './SuspendedUserModal';
import authenticationReducer from '~/store/reducers/authenticationReducer';
import { fromUserDTO } from '~/models/User';
import { fromEstablishmentDTO } from '~/models/Establishment';

const renderWithUser = (suspendedAt: string | null, suspendedCause: string | null) => {
  const userDTO = {
    ...genUserDTO(),
    suspendedAt,
    suspendedCause
  };

  const authUser = {
    user: fromUserDTO(userDTO),
    accessToken: 'fake-token',
    establishment: fromEstablishmentDTO(genEstablishmentDTO())
  };

  const store = configureStore({
    reducer: {
      authentication: authenticationReducer.reducer
    },
    preloadedState: {
      authentication: {
        logIn: {
          data: authUser,
          isError: false,
          isLoading: false,
          isSuccess: true,
          isUninitialized: false
        },
        changeEstablishment: {
          isError: false,
          isLoading: false,
          isSuccess: false,
          isUninitialized: true
        }
      }
    }
  });

  return render(
    <Provider store={store}>
      <SuspendedUserModal />
    </Provider>
  );
};

describe('SuspendedUserModal', () => {
  it('should not render when user is not suspended', () => {
    renderWithUser(null, null);
    expect(screen.queryByText('Accès suspendu')).not.toBeInTheDocument();
  });

  it('should render when user is suspended with expired user rights', () => {
    renderWithUser('2025-01-01T00:00:00Z', 'droits utilisateur expires');
    expect(screen.getByText(/droits utilisateur expirés/i)).toBeInTheDocument();
  });

  it('should render when user is suspended with expired structure rights', () => {
    renderWithUser('2025-01-01T00:00:00Z', 'droits structure expires');
    expect(screen.getByText(/droits de la structure expirés/i)).toBeInTheDocument();
  });

  it('should render when user is suspended with missing CGU', () => {
    renderWithUser('2025-01-01T00:00:00Z', 'cgu vides');
    expect(screen.getByText(/conditions générales d'utilisation non validées/i)).toBeInTheDocument();
  });

  it('should render when user is suspended with multiple reasons', () => {
    renderWithUser('2025-01-01T00:00:00Z', 'droits utilisateur expires, droits structure expires, cgu vides');
    expect(screen.getByText(/droits utilisateur expirés/i)).toBeInTheDocument();
    expect(screen.getByText(/droits de la structure expirés/i)).toBeInTheDocument();
    expect(screen.getByText(/conditions générales d'utilisation non validées/i)).toBeInTheDocument();
  });

  it('should have a link to Portail des Données Foncières', () => {
    renderWithUser('2025-01-01T00:00:00Z', 'droits utilisateur expires');
    const links = screen.getAllByRole('link', { name: /Portail des Données Foncières/i, hidden: true });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'https://portaildf.cerema.fr/');
  });
});
