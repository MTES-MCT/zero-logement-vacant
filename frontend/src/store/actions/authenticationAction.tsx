import { Dispatch } from 'redux';
import { AuthUser } from '../../models/User';
import authService from '../../services/auth.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import establishmentService from '../../services/establishment.service';
import { Establishment } from '../../models/Establishment';
import authenticationSlice from '../reducers/authenticationReducer';

export interface LoginAction {
  authUser: AuthUser;
}
export interface AvailableEstablishmentsFetchedAction {
  availableEstablishments: Establishment[];
}

const { availableEstablishmentsFetched, logoutUser, loginUser, loginFail } =
  authenticationSlice.actions;

export const login = (
  email: string,
  password: string,
  establishmentId?: string
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    authService
      .login(email, password, establishmentId)
      .then((authUser) => {
        if (authUser.accessToken) {
          dispatch(
            loginUser({
              authUser,
            })
          );
        } else {
          dispatch(loginFail());
        }
      })
      .catch(() => {
        dispatch(loginFail());
      })
      .finally(() => {
        dispatch(hideLoading());
      });
  };
};
export const changeEstablishment = (establishmentId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    authService
      .changeEstablishment(establishmentId)
      .then((authUser) => {
        if (authUser.accessToken) {
          dispatch(
            loginUser({
              authUser,
            })
          );
          window.location.reload();
        } else {
          dispatch(loginFail());
        }
      })
      .catch(() => {
        dispatch(loginFail());
      })
      .finally(() => {
        dispatch(hideLoading());
      });
  };
};

export const logout = () => (dispatch: Dispatch) => {
  authService.logout();
  dispatch(logoutUser());
};

export const fetchAvailableEstablishments = () => {
  return function (dispatch: Dispatch) {
    establishmentService
      .listEstablishments({ available: true })
      .then((availableEstablishments) => {
        dispatch(
          availableEstablishmentsFetched({
            availableEstablishments,
          })
        );
      });
  };
};
