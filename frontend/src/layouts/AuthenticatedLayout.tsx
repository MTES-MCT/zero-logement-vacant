import { Outlet } from 'react-router-dom';
import RequireAuth from '../components/Auth/RequireAuth';
import Footer from '../components/Footer/Footer';

import SmallHeader from '../components/Header/SmallHeader';
import OnboardingModal from '../components/modals/OnboardingModal/OnboardingModal';
import { useScrollTop } from '../hooks/useScrollTop';

function AuthenticatedLayout() {
  useScrollTop();

  return (
    <RequireAuth>
      <OnboardingModal />
      <SmallHeader />
      <Outlet />
      <Footer />
    </RequireAuth>
  );
}

export default AuthenticatedLayout;
