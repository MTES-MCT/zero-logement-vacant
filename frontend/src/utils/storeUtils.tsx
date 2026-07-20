import { configureStore } from '@reduxjs/toolkit';

import { applicationMiddlewares, applicationReducer } from '~/store/store';

function configureTestStore() {
  return configureStore({
    reducer: applicationReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      }).concat(applicationMiddlewares) as any,
    preloadedState: {
      app: {
        isDsfrReady: true
      }
    }
  });
}

export default configureTestStore;
