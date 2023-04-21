import { SettingsFetchedAction } from '../actions/settingsAction';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Settings } from '../../models/Settings';

export interface SettingsState {
  settings?: Settings;
}

const initialState: SettingsState = {};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    settingsFetched: (
      state: SettingsState,
      action: PayloadAction<SettingsFetchedAction>
    ) => {
      state.settings = action.payload.settings;
    },
  },
});

export default settingsSlice;
