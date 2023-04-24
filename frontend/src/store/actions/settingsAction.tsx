import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { DeepPartial } from 'ts-essentials';

import { Settings } from '../../../../shared/models/Settings';
import settingsService from '../../services/settings.service';
import settingsSlice from '../reducers/settingsReducer';
import { AppState } from '../store';

export interface SettingsFetchedAction {
  settings: Settings;
}

const { settingsFetched } = settingsSlice.actions;

export const fetchSettings = (establishmentId?: string) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const id =
      establishmentId ?? getState().authentication.authUser?.establishment?.id;

    if (id) {
      settingsService
        .findOne({ establishmentId: id })
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
