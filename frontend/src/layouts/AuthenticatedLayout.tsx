import SkipLinks from '@codegouvfr/react-dsfr/SkipLinks';
import { Suspense } from 'react';
import { Outlet } from 'react-router';

import RequireAuth from '~/components/Auth/RequireAuth';
import Footer from '~/components/Footer/Footer';
import SmallHeader from '~/components/Header/SmallHeader';
import OnboardingModal from '~/components/modals/OnboardingModal/OnboardingModal';
import SuspendedUserModal from '~/components/modals/SuspendedUserModal/SuspendedUserModal';
import { HousingFiltersProvider } from '~/hooks/HousingFiltersContext';
import { useScrollTop } from '~/hooks/useScrollTop';

function AuthenticatedLayout() {
  useScrollTop();

  return (
    <RequireAuth>
      <SkipLinks
        links={[
          { label: 'Contenu', anchor: '#fr-content' },
          { label: 'Menu', anchor: '#fr-header' },
          { label: 'Pied de page', anchor: '#fr-footer' }
        ]}
      />
      <SuspendedUserModal />
      <OnboardingModal />
      <HousingFiltersProvider>
        <SmallHeader />
        <main id="fr-content">
          <Suspense>
            <Outlet />
          </Suspense>
        </main>
      </HousingFiltersProvider>
      <Footer />
    </RequireAuth>
  );
}

export default AuthenticatedLayout;
