import { configureStore, SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import fp from 'lodash/fp';
import { loadingBarReducer } from 'react-redux-loading-bar';

import authenticationReducer from './reducers/authenticationReducer';
import housingReducer from './reducers/housingReducer';
import ownerProspectReducer from './reducers/ownerProspectReducer';
import { zlvApi } from '../services/api.service';

export const applicationReducer = {
  authentication: authenticationReducer.reducer,
  housing: housingReducer.reducer,
  ownerProspect: ownerProspectReducer.reducer,
  loadingBar: loadingBarReducer,
  [zlvApi.reducerPath]: zlvApi.reducer,
};

export const applicationMiddlewares = [zlvApi.middleware];

export const store = configureStore({
  reducer: applicationReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(applicationMiddlewares),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export function isFetchBaseQueryError(
  error: unknown,
): error is FetchBaseQueryError {
  return fp.isObject(error) && 'status' in error;
}

interface HttpError {
  status: number;
  data: {
    name: string;
    message: string;
  };
}

export function isHttpError(error: FetchBaseQueryError): error is HttpError {
  return (
    'data' in error &&
    fp.isObject(error.data) &&
    'name' in error.data &&
    fp.isString(error.data.name) &&
    'message' in error.data &&
    fp.isString(error.data.message)
  );
}

export interface PrintableError {
  name: string;
  message: string;
}

export function unwrapError(
  error: FetchBaseQueryError | SerializedError | undefined,
): PrintableError | undefined {
  if (isFetchBaseQueryError(error)) {
    if (isHttpError(error)) {
      return error.data;
    }
  }
}
