import { createSlice, SerializedError } from '@reduxjs/toolkit';

import { AuthUser } from '../../models/User';
import { changeEstablishment, logIn } from '../thunks/auth-thunks';

const AUTH_KEY = 'authUser';

type FetchAction<Data> = {
  data?: Data;
  error?: SerializedError;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isUninitialized: boolean;
};

function createFetchAction<Data>(data?: Data): FetchAction<Data> {
  return {
    data,
    isError: false,
    isLoading: false,
    isSuccess: false,
    isUninitialized: true
  };
}

export interface AuthenticationState {
  logIn: FetchAction<AuthUser>;
  changeEstablishment: FetchAction<never>;
  isLoggedOut?: boolean;
  /**
   * @deprecated Use `logIn.data` instead
   */
  authUser?: AuthUser;
  /**
   * @deprecated Use `logIn.error` instead
   */
  loginError?: string;
}

const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: (): AuthenticationState => {
    const storage = localStorage.getItem(AUTH_KEY);
    const user = storage ? JSON.parse(storage) : undefined;
    return {
      authUser: user,
      logIn: createFetchAction(user),
      changeEstablishment: createFetchAction()
    };
  },
  reducers: {
    logOut: (): AuthenticationState => {
      localStorage.removeItem(AUTH_KEY);
      return {
        ...authenticationSlice.getInitialState(),
        isLoggedOut: true
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(logIn.pending, (state) => {
        state.logIn.isLoading = true;
        state.logIn.isUninitialized = false;
      })
      .addCase(logIn.fulfilled, (state, action) => {
        localStorage.setItem(AUTH_KEY, JSON.stringify(action.payload));
        state.authUser = action.payload;
        state.logIn.data = action.payload;
        state.logIn.error = undefined;
        state.logIn.isError = false;
        state.logIn.isLoading = false;
        state.logIn.isSuccess = true;
      })
      .addCase(logIn.rejected, (state, action) => {
        state.logIn.error = action.error;
        state.logIn.isError = true;
        state.logIn.isLoading = false;
        state.logIn.isSuccess = false;
      });

    builder
      .addCase(changeEstablishment.pending, (state) => {
        state.changeEstablishment.isLoading = true;
        state.changeEstablishment.isUninitialized = false;
      })
      .addCase(changeEstablishment.fulfilled, (state, action) => {
        localStorage.setItem(AUTH_KEY, JSON.stringify(action.payload));
        state.authUser = action.payload;
        state.changeEstablishment.error = undefined;
        state.changeEstablishment.isError = false;
        state.changeEstablishment.isLoading = false;
        state.changeEstablishment.isSuccess = true;
      })
      .addCase(changeEstablishment.rejected, (state, action) => {
        state.changeEstablishment.error = action.error;
        state.changeEstablishment.isError = true;
        state.changeEstablishment.isLoading = false;
        state.changeEstablishment.isSuccess = false;
      });
  }
});

export default authenticationSlice;
