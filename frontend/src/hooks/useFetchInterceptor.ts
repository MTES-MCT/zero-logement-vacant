import fetchIntercept from 'fetch-intercept';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '~/hooks/useAuth';

export function useFetchInterceptor() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const signOutPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    return fetchIntercept.register({
      request: function (url, config) {
        return [url, config];
      },

      requestError: function (error) {
        return Promise.reject(error);
      },

      response: function (response) {
        if (response.status === 401) {
          signOutPromise.current ??= signOut().finally(() => {
            signOutPromise.current = null;
          });
          void signOutPromise.current
            .then(() => navigate('/connexion'))
            .catch(() => undefined);
        }
        return response;
      },

      responseError: function (error) {
        return Promise.reject(error);
      }
    });
  }, [navigate, signOut]);
}
