import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ApplicationState } from '../store/reducers/applicationReducers';
import {
  fetchSettings as doFetchSettings,
  updateSettings,
} from '../store/actions/settingsAction';

export function useSettings() {
  const dispatch = useDispatch();
  const { settings: state } = useSelector((state: ApplicationState) => state);

  function togglePublishContactPoints() {
    if (state.settings) {
      dispatch(
        updateSettings({
          contactPoints: {
            public: !state.settings.contactPoints.public,
          },
        })
      );
    }
  }

  useEffect(() => {
    dispatch(doFetchSettings());
  }, [dispatch]);

  return {
    settings: state.settings,
    togglePublishContactPoints,
  };
}
