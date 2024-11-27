import { Outlet } from 'react-router-dom';

import SmallHeader from '../components/Header/SmallHeader';
import Footer from '../components/Footer/Footer';
import RequireAuth from '../components/Auth/RequireAuth';

function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <SmallHeader />
      <Outlet />
      <Footer />
    </RequireAuth>
  );
}

export default AuthenticatedLayout;
