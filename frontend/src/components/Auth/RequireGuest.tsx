import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '~/hooks/useAuth';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireGuestProps {}

function RequireGuest(props: PropsWithChildren<RequireGuestProps>) {
  const auth = useAuth();

  if (auth.isLoading) {
    return null;
  }

  if (!auth.isAuthenticated) {
    return props.children;
  }

  return <Navigate to="/parc-de-logements" replace />;
}

export default RequireGuest;
