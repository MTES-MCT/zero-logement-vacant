import fetchIntercept from 'fetch-intercept';
import { logout } from '../../store/actions/authenticationAction';
import { useAppDispatch } from '../../hooks/useStore';

const FetchInterceptor = () => {
  const dispatch = useAppDispatch();
  return fetchIntercept.register({
    request: function (url, config) {
      return [url, config];
    },

    requestError: function (error) {
      return Promise.reject(error);
    },

    response: function (response) {
      if (response.status === 401) {
        dispatch(logout());
      }
      return response;
    },

    responseError: function (error) {
      return Promise.reject(error);
    },
  });
};

export default FetchInterceptor;
