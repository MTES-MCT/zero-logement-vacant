import { PropsWithChildren } from 'react';

import { useUser } from '../../hooks/useUser';
import NotFoundView from '../../views/NotFoundView';

interface RequireGuestProps {}

function RequireGuest(props: PropsWithChildren<RequireGuestProps>) {
  const { isGuest } = useUser();

  if (isGuest) {
    return props.children;
  }

  return <NotFoundView />;
}

export default RequireGuest;
