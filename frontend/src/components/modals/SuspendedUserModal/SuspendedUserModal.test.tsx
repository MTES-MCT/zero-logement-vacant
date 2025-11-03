import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { genUserDTO } from '~/mocks/handlers/data';
import SuspendedUserModal from './SuspendedUserModal';
import authenticationReducer from '~/store/reducers/authenticationReducer';

const renderWithUser = (suspendedAt: string | null, suspendedCause: string | null) => {
  const user = {
    ...genUserDTO(),
    suspendedAt,
    suspendedCause
  };

  const store = configureStore({
    reducer: {
      authentication: authenticationReducer
    },
    preloadedState: {
      authentication: {
        isLoggedIn: true,
        user,
        userId: user.id,
        authRedirectPath: null
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
    const links = screen.getAllByRole('link', { name: /Portail des Données Foncières/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'https://datafoncier.cerema.fr/portail-des-donnees-foncieres');
  });
});
