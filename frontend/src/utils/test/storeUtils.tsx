import { configureStore } from '@reduxjs/toolkit';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { genAuthUser } from '../../../test/fixtures.test';

interface Options {
  withAuth?: boolean;
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
        logIn: options?.withAuth
          ? {
              data: genAuthUser(),
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
