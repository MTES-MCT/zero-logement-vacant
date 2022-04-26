import fetchIntercept from 'fetch-intercept';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/actions/authenticationAction';

const FetchInterceptor = () => {
    const dispatch = useDispatch();
    const unregister = fetchIntercept.register({
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
    return unregister;
};

export default FetchInterceptor;
