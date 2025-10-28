import SkipLinks from '@codegouvfr/react-dsfr/SkipLinks';
import { Outlet } from 'react-router-dom';

import RequireGuest from '~/components/Auth/RequireGuest';
import Header from '~/components/Header/Header';
import Footer from '~/components/Footer/Footer';

function GuestLayout() {
  return (
    <RequireGuest>
      <SkipLinks
        links={[
          { label: 'Contenu', anchor: '#fr-content' },
          { label: 'Pied de page', anchor: '#fr-footer' }
        ]}
      />
      <Header />
      <main id="fr-content">
        <Outlet />
      </main>
      <Footer />
    </RequireGuest>
  );
}

export default GuestLayout;
