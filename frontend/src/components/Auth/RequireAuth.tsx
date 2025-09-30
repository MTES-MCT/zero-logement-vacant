import { usePostHog } from 'posthog-js/react';
import { PropsWithChildren, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useUser } from '../../hooks/useUser';
import { useFetchInterceptor } from '../../hooks/useFetchInterceptor';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireAuthProps {}

function RequireAuth(props: PropsWithChildren<RequireAuthProps>) {
  const { establishment, isAuthenticated, isUsual, isVisitor, user } =
    useUser();
  const location = useLocation();
  const posthog = usePostHog();

  useFetchInterceptor();

  useEffect(() => {
    if (isUsual || isVisitor) {
      if (user?.establishmentId) {
        // Identify users by establishment to avoid tracking them individually
        posthog.identify(user.establishmentId, {
          name: establishment?.name
        });
      }
    }
  }, [isUsual, isVisitor, user]);

  if (isAuthenticated) {
    return props.children;
  }

  return (
    <Navigate to="/connexion" replace state={{ path: location.pathname }} />
  );
}

export default RequireAuth;
