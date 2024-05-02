import { configureStore } from '@reduxjs/toolkit';
import { applicationMiddlewares, applicationReducer } from '../../store/store';
import { genAuthUser } from '../../test/fixtures.test';

interface TestStoreOptions {
  withAuth: boolean;
}

function configureTestStore(opts?: TestStoreOptions) {
  const preloadedState = opts?.withAuth
    ? {
        authentication: { authUser: genAuthUser() },
      }
    : {};

  return configureStore({
    reducer: applicationReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(applicationMiddlewares),
    preloadedState,
  });
}

export default configureTestStore;
