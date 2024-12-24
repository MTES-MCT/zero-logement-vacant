import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useUser } from '../../hooks/useUser';
import { useFetchInterceptor } from '../../hooks/useFetchInterceptor';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireAuthProps {}

function RequireAuth(props: PropsWithChildren<RequireAuthProps>) {
  const { isAuthenticated } = useUser();
  const location = useLocation();

  useFetchInterceptor();

  if (isAuthenticated) {
    return props.children;
  }

  return (
    <Navigate to="/connexion" replace state={{ path: location.pathname }} />
  );
}

export default RequireAuth;
