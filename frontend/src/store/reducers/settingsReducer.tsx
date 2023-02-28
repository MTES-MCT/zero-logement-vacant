import { Settings } from '../../../../shared/models/Settings';
import {
  SETTINGS_FETCHED,
  SettingsActionTypes,
} from '../actions/settingsAction';

export interface SettingsState {
  settings?: Settings;
}

const initialState: SettingsState = {};

const settingsReducer = (state = initialState, action: SettingsActionTypes) => {
  switch (action.type) {
    case SETTINGS_FETCHED:
      return {
        ...state,
        settings: action.settings,
      };
    default:
      return state;
  }
};

export default settingsReducer;
