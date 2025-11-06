import { createAsyncThunk } from '@reduxjs/toolkit';

import type { AuthUser } from '../../models/User';
import authService from '../../services/auth.service';

export const logIn = createAsyncThunk(
  'auth/logIn',
  async (payload: {
    email: string;
    password: string;
    establishmentId?: string;
  }): Promise<AuthUser> => {
    return authService.login(
      payload.email,
      payload.password,
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
