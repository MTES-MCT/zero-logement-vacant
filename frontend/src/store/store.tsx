import { configureStore } from '@reduxjs/toolkit';
import authenticationReducer from './reducers/authenticationReducer';
import housingReducer from './reducers/housingReducer';
import campaignReducer from './reducers/campaignReducer';
import ownerReducer from './reducers/ownerReducer';
import establishmentReducer from './reducers/establishmentReducer';
import ownerProspectReducer from './reducers/ownerProspectReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
import settingsReducer from './reducers/settingsReducer';
import { geoPerimetersApi } from '../services/geo.service';
import { contactPointsApi } from '../services/contact-point.service';
import { localityApi } from '../services/locality.service';
import { userApi } from '../services/user.service';
import { signupLinkApi } from '../services/signup-link.service';
import { noteApi } from '../services/note.service';
import { eventApi } from '../services/event.service';
import { userAccountApi } from '../services/user-account.service';

export const applicationReducer = {
  authentication: authenticationReducer.reducer,
  housing: housingReducer.reducer,
  campaign: campaignReducer.reducer,
  owner: ownerReducer.reducer,
  establishment: establishmentReducer.reducer,
  ownerProspect: ownerProspectReducer.reducer,
  settings: settingsReducer.reducer,
  loadingBar: loadingBarReducer,
  [contactPointsApi.reducerPath]: contactPointsApi.reducer,
  [eventApi.reducerPath]: eventApi.reducer,
  [geoPerimetersApi.reducerPath]: geoPerimetersApi.reducer,
  [localityApi.reducerPath]: localityApi.reducer,
  [noteApi.reducerPath]: noteApi.reducer,
  [signupLinkApi.reducerPath]: signupLinkApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [userAccountApi.reducerPath]: userAccountApi.reducer,
};

export const applicationMiddlewares = [
  contactPointsApi.middleware,
  eventApi.middleware,
  geoPerimetersApi.middleware,
  localityApi.middleware,
  noteApi.middleware,
  signupLinkApi.middleware,
  userApi.middleware,
  userAccountApi.middleware,
];

export const store = configureStore({
  reducer: applicationReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(applicationMiddlewares),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
