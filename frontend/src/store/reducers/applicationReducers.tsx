import { combineReducers } from 'redux';
import authenticationReducer, {
  AuthenticationState,
} from './authenticationReducer';
import housingReducer, { HousingState } from './housingReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
import ownerReducer, { OwnerState } from './ownerReducer';
import campaignReducer, { CampaignState } from './campaignReducer';
import userReducer, { UserState } from './userReducer';
import monitoringReducer, { MonitoringState } from './monitoringReducer';
import establishmentReducer, {
  EstablishmentState,
} from './establishmentReducer';
import ownerProspectReducer, {
  OwnerProspectState,
} from './ownerProspectReducer';

const applicationReducer = combineReducers({
  authentication: authenticationReducer,
  housing: housingReducer,
  campaign: campaignReducer,
  owner: ownerReducer,
  user: userReducer,
  monitoring: monitoringReducer,
  establishment: establishmentReducer,
  ownerProspect: ownerProspectReducer,
  loadingBar: loadingBarReducer,
});

export interface ApplicationState {
  authentication: AuthenticationState;
  housing: HousingState;
  campaign: CampaignState;
  owner: OwnerState;
  user: UserState;
  monitoring: MonitoringState;
  establishment: EstablishmentState;
  ownerProspect: OwnerProspectState;
}

export default applicationReducer;
