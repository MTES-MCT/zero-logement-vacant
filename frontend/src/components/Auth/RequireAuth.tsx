import { usePostHog } from 'posthog-js/react';
import { type PropsWithChildren, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from '~/hooks/useAuth';
import { useUser } from '~/hooks/useUser';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireAuthProps {}

function RequireAuth(props: PropsWithChildren<RequireAuthProps>) {
  const auth = useAuth();
  const user = useUser();
  const location = useLocation();
  const posthog = usePostHog();

  useEffect(() => {
    if (user.isUsual || user.isVisitor) {
      if (user.establishment?.id) {
        posthog.identify(user.establishment.id, {
          name: user.establishment.name
        });
      }
    }
  }, [
    user.isUsual,
    user.isVisitor,
    posthog,
    user.establishment?.id,
    user.establishment?.name
  ]);

  if (auth.isLoading) {
    return null;
  }

  if (auth.isAuthenticated) {
    return props.children;
  }

  return (
    <Navigate to="/connexion" replace state={{ path: location.pathname }} />
  );
}

export default RequireAuth;
