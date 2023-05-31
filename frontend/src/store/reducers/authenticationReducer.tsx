import {
  AvailableEstablishmentsFetchedAction,
  LoginAction,
} from '../actions/authenticationAction';
import { AuthUser } from '../../models/User';
import { Establishment } from '../../models/Establishment';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const authUser = JSON.parse(localStorage.getItem('authUser') ?? '{}');

export interface AuthenticationState {
  availableEstablishments?: Establishment[];
  isLoggedOut?: boolean;
  authUser?: AuthUser;
  loginError?: string;
}

const initialState: AuthenticationState = {
  authUser,
};

const authenticationSlice = createSlice({
  name: 'authentication',
  initialState,
  reducers: {
    loginUser: (
      state: AuthenticationState,
      action: PayloadAction<LoginAction>
    ) => {
      state.isLoggedOut = false;
      state.authUser = action.payload.authUser;
      state.loginError = undefined;
    },
    loginFail: (state: AuthenticationState) => {
      state.isLoggedOut = false;
      state.authUser = undefined;
      state.loginError = "Échec de l'authentification";
    },
    logoutUser: (state: AuthenticationState) => {
      state.isLoggedOut = true;
      state.authUser = undefined;
    },
    availableEstablishmentsFetched: (
      state: AuthenticationState,
      action: PayloadAction<AvailableEstablishmentsFetchedAction>
    ) => {
      state.availableEstablishments = action.payload.availableEstablishments;
    },
  },
});

export default authenticationSlice;
