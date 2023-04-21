import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { DeepPartial } from 'ts-essentials';

import settingsService from '../../services/settings.service';
import settingsSlice from '../reducers/settingsReducer';
import { AppState } from '../store';
import { Settings } from '../../models/Settings';

export interface SettingsFetchedAction {
  settings: Settings;
}

const { settingsFetched } = settingsSlice.actions;

export const fetchSettings = () => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const establishmentId =
      getState().authentication.authUser?.establishment.id;

    if (establishmentId) {
      settingsService
        .findOne({ establishmentId })
        .then((settings) => {
          dispatch(
            settingsFetched({
              settings,
            })
          );
        })
        .finally(() => {
          dispatch(hideLoading());
        });
    }
  };
};

export const updateSettings = (settings: DeepPartial<Settings>) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const establishmentId =
      getState().authentication.authUser?.establishment.id;

    if (establishmentId) {
      settingsService
        .upsert(establishmentId, settings)
        .then(() => {
          fetchSettings()(dispatch, getState);
        })
        .finally(() => {
          dispatch(hideLoading());
        });
    }
  };
};
