import { configureStore } from '@reduxjs/toolkit';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { genAuthUser } from '../../../test/fixtures.test';

interface TestStoreOptions {
  withAuth: boolean;
}

function configureTestStore(opts?: TestStoreOptions) {
  return configureStore({
    reducer: applicationReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      }).concat(applicationMiddlewares),
    preloadedState: opts?.withAuth
      ? {
          authentication: {
            logIn: {
              data: genAuthUser(),
              isError: false,
              isLoading: false,
              isSuccess: true,
              isUninitialized: false
            },
            changeEstablishment: {
              isError: false,
              isLoading: false,
              isSuccess: false,
              isUninitialized: true
            }
          }
        }
      : undefined
  });
}

export default configureTestStore;
