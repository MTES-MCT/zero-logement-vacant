import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router';

import { useUser } from '../../hooks/useUser';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireGuestProps {}

function RequireGuest(props: PropsWithChildren<RequireGuestProps>) {
  const { isGuest } = useUser();

  if (isGuest) {
    return props.children;
  }

  return <Navigate to="/parc-de-logements" replace />;
}

export default RequireGuest;
