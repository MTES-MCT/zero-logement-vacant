import { createSlice } from '@reduxjs/toolkit';

const AUTH_KEY = 'authUser';

export interface AuthenticationState {
  isLoggedOut?: boolean;
}

const authenticationSlice = createSlice({
  name: 'authentication',
  initialState: (): AuthenticationState => ({}),
  reducers: {
    logOut: (): AuthenticationState => {
      localStorage.removeItem(AUTH_KEY);
      return {
        isLoggedOut: true
      };
    }
  }
});

export default authenticationSlice;
