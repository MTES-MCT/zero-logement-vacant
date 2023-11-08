import { configureStore } from '@reduxjs/toolkit';
import authenticationReducer from './reducers/authenticationReducer';
import housingReducer from './reducers/housingReducer';
import ownerProspectReducer from './reducers/ownerProspectReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
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
import { settingsApi } from '../services/settings.service';
import { groupApi } from '../services/group.service';
import { dashboardApi } from '../services/dashboard.service';
import { datafoncierApi } from '../services/datafoncier.service';
import { campaignApi } from '../services/campaign.service';

export const applicationReducer = {
  authentication: authenticationReducer.reducer,
  housing: housingReducer.reducer,
  ownerProspect: ownerProspectReducer.reducer,
  loadingBar: loadingBarReducer,
  [campaignApi.reducerPath]: campaignApi.reducer,
  [contactPointsApi.reducerPath]: contactPointsApi.reducer,
  [establishmentApi.reducerPath]: establishmentApi.reducer,
  [eventApi.reducerPath]: eventApi.reducer,
  [geoPerimetersApi.reducerPath]: geoPerimetersApi.reducer,
  [groupApi.reducerPath]: groupApi.reducer,
  [housingApi.reducerPath]: housingApi.reducer,
  [localityApi.reducerPath]: localityApi.reducer,
  [noteApi.reducerPath]: noteApi.reducer,
  [ownerApi.reducerPath]: ownerApi.reducer,
  [ownerProspectApi.reducerPath]: ownerProspectApi.reducer,
  [settingsApi.reducerPath]: settingsApi.reducer,
  [signupLinkApi.reducerPath]: signupLinkApi.reducer,
  [userAccountApi.reducerPath]: userAccountApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  [datafoncierApi.reducerPath]: datafoncierApi.reducer,
};

export const applicationMiddlewares = [
  campaignApi.middleware,
  contactPointsApi.middleware,
  dashboardApi.middleware,
  datafoncierApi.middleware,
  establishmentApi.middleware,
  eventApi.middleware,
  geoPerimetersApi.middleware,
  groupApi.middleware,
  housingApi.middleware,
  localityApi.middleware,
  noteApi.middleware,
  ownerApi.middleware,
  ownerProspectApi.middleware,
  settingsApi.middleware,
  signupLinkApi.middleware,
  userAccountApi.middleware,
  userApi.middleware,
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
