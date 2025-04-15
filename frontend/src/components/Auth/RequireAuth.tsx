import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useUser } from '../../hooks/useUser';
import { useFetchInterceptor } from '../../hooks/useFetchInterceptor';
import config from '../../utils/config';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireAuthProps {}

function RequireAuth(props: PropsWithChildren<RequireAuthProps>) {
  const { isAuthenticated, user, jimoData } = useUser();
  const location = useLocation();

  useFetchInterceptor();

  if (isAuthenticated) {
    if (config.jimo.enabled && user) {
      window['jimo'].push(['do', 'identify', [user.id]]);
      window['jimo'].push([ 'set', 'user:attributes', [ jimoData ]]);
    }
    return props.children;
  }

  return (
    <Navigate to="/connexion" replace state={{ path: location.pathname }} />
  );
}

export default RequireAuth;
