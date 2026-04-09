import { render, screen } from '@testing-library/react';
import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import SuspendedUserModal from '~/components/modals/SuspendedUserModal/SuspendedUserModal';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import configureTestStore from '~/utils/storeUtils';

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

  const store = configureTestStore({
    auth: authUser
  });

  render(
    <Provider store={store}>
      <SuspendedUserModal />
    </Provider>
  );
};

describe('SuspendedUserModal', () => {
  it('should render when user is suspended with expired user rights', async () => {
    renderWithUser('2025-01-01T00:00:00Z', 'droits utilisateur expires');
    expect(
      await screen.findByText(
        /Vos droits d.accès à Zéro Logement Vacant ne sont plus valides/i
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        /La date d.expiration de vos droits d.accès aux données LOVAC en tant qu.utilisateur a été dépassée/i
      )
    ).toBeInTheDocument();
  });

  it('should render when user is suspended with expired structure rights', async () => {
    renderWithUser('2025-01-01T00:00:00Z', 'droits structure expires');

    expect(
      await screen.findByText(
        /Vos droits d.accès à Zéro Logement Vacant ne sont plus valides/i
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        /La date d.expiration des droits d.accès aux données LOVAC de votre structure a été dépassée/i
      )
    ).toBeInTheDocument();
  });

  it('should render when user is suspended with missing CGU', async () => {
    renderWithUser('2025-01-01T00:00:00Z', 'cgu vides');

    expect(
      await screen.findByText(
        /Vos droits d.accès à Zéro Logement Vacant ne sont plus valides/i
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        /Les conditions générales d.utilisation du portail Données Foncières du Cerema n.ont pas été validées/i
      )
    ).toBeInTheDocument();
  });

  it('should render when user is suspended with multiple reasons', async () => {
    renderWithUser(
      '2025-01-01T00:00:00Z',
      'droits utilisateur expires, droits structure expires, cgu vides'
    );

    expect(
      await screen.findByText(
        /Vos droits d.accès à Zéro Logement Vacant ne sont plus valides/i
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        /La date d.expiration de vos droits d.accès aux données LOVAC en tant qu.utilisateur ou ceux de votre structure a été dépassée/i
      )
    ).toBeInTheDocument();
  });

  it('should have a link to Portail des Données Foncières', async () => {
    renderWithUser('2025-01-01T00:00:00Z', 'droits utilisateur expires');

    const links = await screen.findAllByRole('link', {
      name: /Portail des Données Foncières/i,
      hidden: true
    });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'https://portaildf.cerema.fr/');
  });
});
