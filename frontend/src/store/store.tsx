import { configureStore } from '@reduxjs/toolkit';
import authenticationReducer from './reducers/authenticationReducer';
import housingReducer from './reducers/housingReducer';
import campaignReducer from './reducers/campaignReducer';
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
import { ownerApi } from '../services/owner.service';
import { housingApi } from '../services/housing.service';
import { establishmentApi } from '../services/establishment.service';
import { ownerProspectApi } from '../services/owner-prospect.service';
import { groupApi } from '../services/group.service';

export const applicationReducer = {
  authentication: authenticationReducer.reducer,
  housing: housingReducer.reducer,
  campaign: campaignReducer.reducer,
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
  [ownerApi.reducerPath]: ownerApi.reducer,
  [housingApi.reducerPath]: housingApi.reducer,
  [groupApi.reducerPath]: groupApi.reducer,
  [establishmentApi.reducerPath]: establishmentApi.reducer,
  [ownerProspectApi.reducerPath]: ownerProspectApi.reducer,
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
  ownerApi.middleware,
  housingApi.middleware,
  groupApi.middleware,
  establishmentApi.middleware,
  ownerProspectApi.middleware,
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
