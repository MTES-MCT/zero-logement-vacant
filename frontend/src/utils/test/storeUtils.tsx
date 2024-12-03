import { configureStore } from '@reduxjs/toolkit';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { genAuthUser } from '../../../test/fixtures.test';

function configureTestStore() {
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
  });
}

export default configureTestStore;
