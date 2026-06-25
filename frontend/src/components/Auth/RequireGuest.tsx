import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router';

import { useOptionalAuth } from '~/hooks/useAuth';
import { useUser } from '~/hooks/useUser';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireGuestProps {}

function RequireGuest(props: PropsWithChildren<RequireGuestProps>) {
  // Dual-path during the auth-v2 transition. Removed in Part B.
  const v2 = useOptionalAuth();
  const legacy = useUser();

  const v2Authenticated = v2 !== null && v2.user !== null;
  const isGuest = !v2Authenticated && legacy.isGuest;

  if (isGuest) {
    return props.children;
  }

  return <Navigate to="/parc-de-logements" replace />;
}

export default RequireGuest;
