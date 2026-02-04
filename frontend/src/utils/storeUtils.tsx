import { configureStore } from '@reduxjs/toolkit';

import { applicationMiddlewares, applicationReducer } from '~/store/store';
import { type AuthUser } from '../models/User';

interface Options {
  /**
   * @deprecated Use {@link auth} instead.
   */
  withAuth?: boolean;
  auth?: AuthUser;
}

function configureTestStore(options?: Options) {
  localStorage.setItem('authUser', JSON.stringify(options?.auth ?? null));

  return configureStore({
    reducer: applicationReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      }).concat(applicationMiddlewares) as any,
    preloadedState: {
      app: {
        isDsfrReady: true
      },
      authentication: {
        logIn: options?.auth
          ? {
              data: options.auth,
              isError: false,
              isLoading: false,
              isSuccess: true,
              isUninitialized: false
            }
          : {
              isError: false,
              isLoading: false,
              isSuccess: false,
              isUninitialized: true
            },
        verifyTwoFactor: {
          isError: false,
          isLoading: false,
          isSuccess: false,
          isUninitialized: true
        },
        changeEstablishment: {
          isError: false,
          isLoading: false,
          isSuccess: false,
          isUninitialized: true
        }
      }
    }
  });
}

export default configureTestStore;
