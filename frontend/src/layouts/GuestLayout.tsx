import { Outlet } from 'react-router-dom';

import RequireGuest from '../components/Auth/RequireGuest';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';

function GuestLayout() {
  return (
    <RequireGuest>
      <Header />
      <Outlet />
      <Footer />
    </RequireGuest>
  );
}

export default GuestLayout;
