import { PropsWithChildren } from 'react';

import { useUser } from '../../hooks/useUser';
import { Navigate } from 'react-router-dom';

interface RequireGuestProps {}

function RequireGuest(props: PropsWithChildren<RequireGuestProps>) {
  const { isGuest } = useUser();

  if (isGuest) {
    return props.children;
  }

  return <Navigate to="/parc-de-logements" replace />;
}

export default RequireGuest;
