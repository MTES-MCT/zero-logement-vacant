import fetchIntercept from 'fetch-intercept';
import { useNavigate } from 'react-router-dom';

import { logOut } from '../store/actions/authenticationAction';
import { useAppDispatch } from './useStore';
import { useEffect } from 'react';

export function useFetchInterceptor() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

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
          dispatch(logOut());
          navigate('/connexion');
        }
        return response;
      },

      responseError: function (error) {
        return Promise.reject(error);
      }
    });
  }, [dispatch, navigate]);
}
