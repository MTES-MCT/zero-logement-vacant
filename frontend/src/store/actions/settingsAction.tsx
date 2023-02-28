import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { DeepPartial } from 'ts-essentials';

import { ApplicationState } from '../reducers/applicationReducers';
import { Settings } from '../../../../shared/models/Settings';
import settingsService from '../../services/settings.service';

export const SETTINGS_FETCHED = 'SETTINGS_FETCHED';

export interface SettingsFetchedAction {
  type: typeof SETTINGS_FETCHED;
  settings: Settings;
}

export type SettingsActionTypes = SettingsFetchedAction;

export const fetchSettings = () => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const establishmentId = getState().authentication.authUser.establishment.id;

    settingsService
      .findOne({ establishmentId })
      .then((settings) => {
        dispatch({
          type: SETTINGS_FETCHED,
          settings,
        });
      })
      .finally(() => {
        dispatch(hideLoading());
      });
  };
};

export const updateSettings = (settings: DeepPartial<Settings>) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const state = getState().settings;

    settingsService
      .upsert({
        ...settings,
        id: state.settings?.id,
        establishmentId: state.settings?.establishmentId,
      })
      .then(() => {
        dispatch({
          type: SETTINGS_FETCHED,
          settings,
        });
      })
      .finally(() => {
        dispatch(hideLoading());
      });
  };
};
