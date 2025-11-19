import { createAsyncThunk } from '@reduxjs/toolkit';

import type { AuthUser } from '../../models/User';
import authService, { type LoginResponse } from '../../services/auth.service';

export const logIn = createAsyncThunk(
  'auth/logIn',
  async (payload: {
    email: string;
    password: string;
    establishmentId?: string;
  }): Promise<LoginResponse> => {
    return authService.login(
      payload.email,
      payload.password,
      payload.establishmentId
    );
  }
);

export const verifyTwoFactor = createAsyncThunk(
  'auth/verifyTwoFactor',
  async (payload: {
    email: string;
    code: string;
    establishmentId?: string;
  }): Promise<AuthUser> => {
    return authService.verifyTwoFactor(
      payload.email,
      payload.code,
      payload.establishmentId
    );
  }
);

export const changeEstablishment = createAsyncThunk(
  'auth/changeEstablishment',
  async (establishmentId: string): Promise<AuthUser> => {
    return authService.changeEstablishment(establishmentId);
  }
);
