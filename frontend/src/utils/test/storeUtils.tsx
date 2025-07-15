import { configureStore } from '@reduxjs/toolkit';

import { AuthUser } from '../../models/User';
import { applicationMiddlewares, applicationReducer } from '../../store/store';

interface Options {
  /**
   * @deprecated Use {@link auth} instead.
   */
  withAuth?: boolean;
  auth?: AuthUser;
}

function configureTestStore(options?: Options) {
  return configureStore({
    reducer: applicationReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      }).concat(applicationMiddlewares),
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
