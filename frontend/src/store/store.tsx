import { configureStore } from '@reduxjs/toolkit';
import authenticationReducer from './reducers/authenticationReducer';
import housingReducer from './reducers/housingReducer';
import campaignReducer from './reducers/campaignReducer';
import ownerReducer from './reducers/ownerReducer';
import userReducer from './reducers/userReducer';
import monitoringReducer from './reducers/monitoringReducer';
import establishmentReducer from './reducers/establishmentReducer';
import ownerProspectReducer from './reducers/ownerProspectReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
import settingsReducer from './reducers/settingsReducer';

export const applicationReducer = {
  authentication: authenticationReducer.reducer,
  housing: housingReducer.reducer,
  campaign: campaignReducer.reducer,
  owner: ownerReducer.reducer,
  user: userReducer.reducer,
  monitoring: monitoringReducer.reducer,
  establishment: establishmentReducer.reducer,
  ownerProspect: ownerProspectReducer.reducer,
  settings: settingsReducer.reducer,
  loadingBar: loadingBarReducer,
};

export const store = configureStore({
  reducer: applicationReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
