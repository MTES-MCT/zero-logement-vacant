import { Outlet } from 'react-router-dom';

import SmallHeader from '../components/Header/SmallHeader';
import Footer from '../components/Footer/Footer';
import RequireAuth from '../components/Auth/RequireAuth';
import OnboardingModal from '../components/modals/OnboardingModal/OnboardingModal';

function AuthenticatedLayout() {
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
