import { usePostHog } from 'posthog-js/react';
import { type PropsWithChildren, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useOptionalAuth } from '~/hooks/useAuth';
import { useFetchInterceptor } from '~/hooks/useFetchInterceptor';
import { useUser } from '~/hooks/useUser';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequireAuthProps {}

function RequireAuth(props: PropsWithChildren<RequireAuthProps>) {
  // During the auth-v2 transition window, prefer the cookie-backed AuthContext
  // when AuthProvider is mounted. Fall back to the legacy Redux-backed useUser
  // for JWT clients. The dual-path is removed in Part B (post-cutover).
  const v2 = useOptionalAuth();
  const legacy = useUser();
  const location = useLocation();
  const posthog = usePostHog();

  useFetchInterceptor();

  const v2Authenticated = v2 !== null && v2.user !== null;
  const isAuthenticated = v2Authenticated || legacy.isAuthenticated;

  useEffect(() => {
    if (legacy.isUsual || legacy.isVisitor) {
      if (legacy.user?.establishmentId) {
        posthog.identify(legacy.user.establishmentId, {
          name: legacy.establishment?.name
        });
      }
    }
  }, [legacy.isUsual, legacy.isVisitor, legacy.user, posthog, legacy.establishment?.name]);

  if (isAuthenticated) {
    return props.children;
  }

  return (
    <Navigate to="/connexion" replace state={{ path: location.pathname }} />
  );
}

export default RequireAuth;
